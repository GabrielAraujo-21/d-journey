// src/stores/registros.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@/services/api' // <— alterna dev/prod sob o capô

// IMPORTA TODOS OS HELPERS DE DATAS DO PLUGIN CENTRALIZADO
import {
  toISODate,
  addDays,
  formatShort,
  weekStart, // alias para getWeekStart
  weekLabel,
  dateISOAtWeekOffset,
  weekdayLabelByIndex,
  weekdayLabelByDate,
  weekdayLabel,
  toMinutes,
  pairMinutes,
} from '@/plugins/dates'

export const useRegistrosStore = defineStore('registros', () => {
  const apiBase = ref('http://localhost:3000') // preservado p/ compatibilidade externa (não usado em prod)
  const userId = ref(null)

  const entries = ref({}) // { 'YYYY-MM-DD': [ { in, out }, ... ] }
  const idByDate = ref({}) // { 'YYYY-MM-DD': <id> }

  // === NOVO: validação conjunta ===
  /**
   * status: 'rascunho' | 'pronto' | 'enviado' | 'aprovado' | 'reprovado' | 'fechado'
   */
  const statusByDate = ref({}) // { iso: 'rascunho' | ... }
  const metaByDate = ref({}) // { iso: { submittedAt, reviewedAt, reviewerId, reviewNote, locks, revision } }
  const historyByDate = ref({}) // { iso: [ { at, by, action, from, to, reason } ] }

  // fila de escrita por chave (userId|iso)
  const writeQueues = new Map()

  function init({ userId: uid, apiBase: base } = {}) {
    if (uid != null) userId.value = Number(uid)
    if (base) apiBase.value = String(base).replace(/\/$/, '')
  }

  /* ========= Identidade de registro ========= */
  function recordId(uid, iso) {
    const ymd = String(iso).replaceAll('-', '')
    return `${ymd}-${uid}`
  }

  /* ========= Derivados ========= */
  const pairsCountByDate = computed(() => {
    const out = {}
    for (const iso of Object.keys(entries.value || {})) {
      const arr = entries.value[iso]
      out[iso] = Array.isArray(arr) ? arr.length : 0
    }
    return out
  })
  function pairsCountOf(iso) {
    const arr = entries.value[iso]
    return Array.isArray(arr) ? arr.length : 0
  }

  /* ========= Remoto (leitura) ========= */
  // ===== leitura remota (estendido p/ status/meta) =====
  async function fetchDay(iso) {
    const arr = await http.get('/registros', {
      search: { userId: userId.value, data: iso, _limit: 1 },
    })
    if (Array.isArray(arr) && arr.length) {
      const it = arr[0]
      return {
        pairs: Array.isArray(it.pares) ? it.pares : [],
        id: it.id,
        createdAt: it.createdAt ?? null,
        // ===== NOVO =====
        status: it.status || 'rascunho',
        meta: it.meta || {
          submittedAt: null,
          reviewedAt: null,
          reviewerId: null,
          reviewNote: '',
          locks: { userLocked: false },
          revision: it.revision ?? 0,
        },
        history: Array.isArray(it.history) ? it.history : [],
      }
    }
    // fallback vazio
    return {
      pairs: [],
      id: null,
      createdAt: null,
      status: 'rascunho',
      meta: {
        submittedAt: null,
        reviewedAt: null,
        reviewerId: null,
        reviewNote: '',
        locks: { userLocked: false },
        revision: 0,
      },
      history: [],
    }
  }

  async function ensureDayLoaded(iso) {
    if (iso in entries.value && iso in statusByDate.value) return
    const { pairs, id, status, meta, history } = await fetchDay(iso)
    entries.value[iso] = pairs
    if (id != null) idByDate.value[iso] = id
    statusByDate.value[iso] = status || 'rascunho'
    metaByDate.value[iso] = meta || { locks: { userLocked: false }, revision: 0 }
    historyByDate.value[iso] = history || []
  }

  async function fetchRange(startDate, endDate) {
    const startISO = toISODate(startDate)
    const endISO = toISODate(endDate)
    const arr = await http.get('/registros', {
      search: {
        userId: userId.value,
        data_gte: startISO,
        data_lte: endISO,
        _sort: 'data',
        _order: 'asc',
      },
    })
    const map = {}
    for (const it of arr) {
      map[it.data] = {
        pairs: Array.isArray(it.pares) ? it.pares : [],
        id: it.id,
        status: it.status || 'rascunho',
        meta: it.meta || { locks: { userLocked: false }, revision: it.revision ?? 0 },
        history: Array.isArray(it.history) ? it.history : [],
      }
    }
    return map
  }

  async function preloadRange(startDate, endDate) {
    const map = await fetchRange(startDate, endDate)
    for (const [iso, obj] of Object.entries(map)) {
      entries.value[iso] = obj.pairs
      if (obj.id != null) idByDate.value[iso] = obj.id
      statusByDate.value[iso] = obj.status || 'rascunho'
      metaByDate.value[iso] = obj.meta || { locks: { userLocked: false }, revision: 0 }
      historyByDate.value[iso] = obj.history || []
    }
    return map
  }

  /* ========= Gravação com fila ========= */
  function enqueue(key, op) {
    const prev = writeQueues.get(key) || Promise.resolve()
    const next = prev.then(op).finally(() => {
      if (writeQueues.get(key) === next) writeQueues.delete(key)
    })
    writeQueues.set(key, next)
    return next
  }

  /* ========= Helpers locais ========= */
  function setPairs(iso, val) {
    entries.value[iso] = Array.isArray(val) ? [...val] : []
  }
  function addPair(iso, pair = { in: '', out: '' }) {
    const curr = entries.value[iso] || []
    entries.value[iso] = [...curr, { in: pair.in ?? '', out: pair.out ?? '' }]
  }
  function removePairAt(iso, index) {
    const curr = entries.value[iso] || []
    const next = curr.slice()
    next.splice(index, 1)
    entries.value[iso] = next
  }
  function duplicatePairAt(iso, index) {
    const curr = entries.value[iso] || []
    const p = curr[index]
    if (!p) return
    entries.value[iso] = [...curr, { in: p.in, out: p.out }]
  }
  function sortPairsAsc(iso) {
    const curr = entries.value[iso] || []
    entries.value[iso] = [...curr].sort((a, b) => toMinutes(a.in) - toMinutes(b.in))
  }
  function clearDay(iso) {
    entries.value[iso] = []
  }

  async function clearAllFromServer() {
    const arr = await http.get('/registros', { search: { userId: userId.value } })
    // idem nota do .data acima — ajuste se necessário
    await Promise.all(arr.map((it) => http.delete(`/registros/${encodeURIComponent(it.id)}`)))
    clearAllFromClient()
  }

  function switchUser(uid, base) {
    // Limpa tudo do usuário anterior e aponta para o novo
    clearAllFromClient()
    init({ userId: uid, apiBase: base })
  }

  // ===== NOVO: status/meta/history =====
  function getStatusOf(iso) {
    return statusByDate.value[iso] || 'rascunho'
  }
  function setStatus(iso, next, { by, reason } = {}) {
    const prev = getStatusOf(iso)
    statusByDate.value[iso] = next
    // history
    recordHistory(iso, { action: 'status', from: prev, to: next, by, reason })
  }
  function setMeta(iso, patch) {
    const now = metaByDate.value[iso] || { locks: { userLocked: false }, revision: 0 }
    metaByDate.value[iso] = { ...now, ...(patch || {}) }
  }
  function recordHistory(iso, { action, from, to, by, reason }) {
    const arr = historyByDate.value[iso] || []
    const it = {
      at: new Date().toISOString(),
      action,
      from,
      to,
      by: by ?? userId.value,
      reason: reason ?? '',
    }
    historyByDate.value[iso] = [...arr, it]
  }

  async function persist(iso) {
    const key = `${userId.value}|${iso}`
    return enqueue(key, async () => {
      const pairs = entries.value[iso] || []
      const totalMin = pairs.reduce((acc, p) => acc + pairMinutes(p), 0)
      const existingId = idByDate.value[iso]
      const status = statusByDate.value[iso] || 'rascunho'
      const meta = metaByDate.value[iso] || { locks: { userLocked: false }, revision: 0 }
      const history = historyByDate.value[iso] || []

      if (existingId != null) {
        await http.patch(`/registros/${encodeURIComponent(existingId)}`, {
          pares: pairs,
          totalMin,
          status,
          meta,
          history,
          updatedAt: new Date().toISOString(),
        })
        return
      }

      const newId = recordId(userId.value, iso)
      await http.post('/registros', {
        id: newId,
        userId: userId.value,
        data: iso,
        pares: pairs,
        totalMin,
        status,
        meta,
        history,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      idByDate.value[iso] = newId
    })
  }

  // ===== NOVO: ações de validação (cliente + best-effort servidor) =====
  async function markReady(iso) {
    setStatus(iso, 'pronto')
    await persist(iso)
  }

  async function markDraft(iso) {
    setStatus(iso, 'rascunho')
    await persist(iso)
  }

  async function submitDay(iso) {
    setStatus(iso, 'enviado')
    setMeta(iso, { submittedAt: new Date().toISOString(), locks: { userLocked: true } })
    // tenta endpoint dedicado; se falhar, persiste genérico
    try {
      const id = idByDate.value[iso] ?? recordId(userId.value, iso)
      await http.post(`/registros/${encodeURIComponent(id)}/submit`)
    } catch {
      /* ignora e persiste normal */
    }
    await persist(iso)
  }

  async function retractDay(iso) {
    // volta para 'pronto' (ou rascunho, se preferir)
    setStatus(iso, 'pronto')
    setMeta(iso, { locks: { userLocked: false } })
    try {
      const id = idByDate.value[iso] ?? recordId(userId.value, iso)
      await http.post(`/registros/${encodeURIComponent(id)}/retract`)
    } catch (error) {
      console.error('Error retracting day:', error)
    }
    await persist(iso)
  }

  async function approveDay(iso, { reviewerId, note } = {}) {
    setStatus(iso, 'aprovado', { by: reviewerId })
    setMeta(iso, {
      reviewedAt: new Date().toISOString(),
      reviewerId: reviewerId ?? null,
      reviewNote: note ?? '',
      locks: { userLocked: true },
    })
    try {
      const id = idByDate.value[iso] ?? recordId(userId.value, iso)
      await http.post(`/registros/${encodeURIComponent(id)}/approve`, { reviewNote: note })
    } catch (error) {
      console.error('Error approving day:', error)
    }
    await persist(iso)
  }

  async function rejectDay(iso, { reviewerId, note } = {}) {
    setStatus(iso, 'reprovado', { by: reviewerId, reason: note })
    setMeta(iso, {
      reviewedAt: new Date().toISOString(),
      reviewerId: reviewerId ?? null,
      reviewNote: note ?? '',
      locks: { userLocked: false },
    })
    try {
      const id = idByDate.value[iso] ?? recordId(userId.value, iso)
      await http.post(`/registros/${encodeURIComponent(id)}/reject`, { reviewNote: note })
    } catch (error) {
      console.error('Error rejecting day:', error)
    }
    await persist(iso)
  }

  async function reopenDay(iso, { reviewerId, reason } = {}) {
    const rev = (metaByDate.value[iso]?.revision ?? 0) + 1
    setStatus(iso, 'rascunho', { by: reviewerId, reason })
    setMeta(iso, { revision: rev, locks: { userLocked: false } })
    try {
      const id = idByDate.value[iso] ?? recordId(userId.value, iso)
      await http.post(`/registros/${encodeURIComponent(id)}/reopen`, { reason })
    } catch (error) {
      console.error('Error reopening day:', error)
    }
    await persist(iso)
  }

  async function closeDay(iso, { reviewerId } = {}) {
    setStatus(iso, 'fechado', { by: reviewerId })
    setMeta(iso, { locks: { userLocked: true } })
    try {
      const id = idByDate.value[iso] ?? recordId(userId.value, iso)
      await http.post(`/registros/${encodeURIComponent(id)}/close`)
    } catch (error) {
      console.error('Error closing day:', error)
    }
    await persist(iso)
  }

  // ===== limpeza (mantidos e estendido) =====
  function clearAllFromClient() {
    entries.value = {}
    idByDate.value = {}
    statusByDate.value = {}
    metaByDate.value = {}
    historyByDate.value = {}
  }
  function clearCache() {
    clearAllFromClient()
  }

  // ===== export =====
  return {
    // estado
    apiBase,
    userId,
    entries,
    idByDate,
    // NOVO
    statusByDate,
    metaByDate,
    historyByDate,

    // init
    init,
    switchUser,

    // utils
    toISODate,
    addDays,
    formatShort,
    weekStart,
    weekLabel,
    dateISOAtWeekOffset,
    weekdayLabelByIndex,
    weekdayLabelByDate,
    weekdayLabel,
    toMinutes,
    pairMinutes,

    // derivados
    pairsCountByDate,
    pairsCountOf,

    // IO
    fetchDay,
    ensureDayLoaded,
    fetchRange,
    preloadRange,
    persist,
    clearAllFromServer,
    clearAllFromClient,
    clearCache,

    // helpers locais
    setPairs,
    addPair,
    removePairAt,
    duplicatePairAt,
    sortPairsAsc,
    clearDay,

    // NOVO API validação
    getStatusOf,
    setStatus,
    setMeta,
    recordHistory,
    markReady,
    markDraft,
    submitDay,
    retractDay,
    approveDay,
    rejectDay,
    reopenDay,
    closeDay,
  }
})
