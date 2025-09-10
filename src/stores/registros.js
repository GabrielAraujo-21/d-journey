// src/stores/registros.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useRegistrosStore = defineStore('registros', () => {
  const apiBase = ref('http://localhost:3000') // sem barra final
  const userId = ref(null)

  // cache local indexado por ISO do dia: { 'YYYY-MM-DD': [ { in, out }, ... ] }
  const entries = ref({})
  // mapeia ISO -> id do registro no backend (numérico OU string)
  const idByDate = ref({})

  // fila de escrita por chave (userId|data) para serializar updates
  const writeQueues = new Map()

  function init({ userId: uid, apiBase: base } = {}) {
    if (uid != null) userId.value = Number(uid)
    if (base) apiBase.value = String(base).replace(/\/$/, '')
  }

  /* ========= Utils (locais, mantidos) ========= */
  function toISODate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  function addDays(date, days) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }
  function formatShort(d) {
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}`
  }
  function weekStart(d, startOnMonday = true) {
    const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const day = tmp.getDay() // 0=Dom
    const diff = startOnMonday ? (day === 0 ? 6 : day - 1) : day
    tmp.setDate(tmp.getDate() - diff)
    tmp.setHours(0, 0, 0, 0)
    return tmp
  }
  function weekLabel(startDate) {
    const start = new Date(startDate)
    const end = addDays(start, 6)
    return `${formatShort(start)} – ${formatShort(end)}`
  }
  function dateISOAtWeekOffset(start, dayIdx) {
    return toISODate(addDays(start, dayIdx))
  }
  function weekdayLabelByIndex(idx, startOnMonday = true) {
    const listMon = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    const listSun = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return startOnMonday ? listMon[idx] : listSun[idx]
  }
  function weekdayLabelByDate(d) {
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return names[d.getDay()]
  }
  const weekdayLabel = weekdayLabelByDate

  function toMinutes(hm) {
    if (!hm || !/^\d{2}:\d{2}$/.test(hm)) return NaN
    const [h, m] = hm.split(':').map(Number)
    return h * 60 + m
  }
  function pairMinutes(p) {
    const a = toMinutes(p.in)
    const b = toMinutes(p.out)
    if (Number.isNaN(a) || Number.isNaN(b)) return 0
    let diff = b - a
    if (diff < 0) diff += 24 * 60 // cruza a meia-noite
    return Math.max(0, diff)
  }

  // ========= ID determinístico para NOVOS dias =========
  // Alinhado ao padrão combinado: "YYYYMMDD-<userId>"
  // Ex.: iso "2025-09-09", uid 1 -> "20250909-1"
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

  /* ========= HTTP ========= */
  async function _json(url, opts) {
    const res = await fetch(url, opts)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.status === 204 ? null : res.json()
  }

  /* ========= Remoto (leitura) ========= */
  // Busca por (userId,data) para funcionar com IDs numéricos antigos e strings novas
  async function fetchDay(iso) {
    const url = `${apiBase.value}/registros?userId=${encodeURIComponent(
      userId.value,
    )}&data=${encodeURIComponent(iso)}&_limit=1`
    const arr = await _json(url)
    if (Array.isArray(arr) && arr.length) {
      const it = arr[0]
      return {
        pairs: Array.isArray(it.pares) ? it.pares : [],
        id: it.id, // número ou string
        createdAt: it.createdAt ?? null,
      }
    }
    return { pairs: [], id: null, createdAt: null }
  }

  async function ensureDayLoaded(iso) {
    if (iso in entries.value) return
    const { pairs, id } = await fetchDay(iso)
    entries.value[iso] = pairs
    if (id != null) idByDate.value[iso] = id
  }

  async function fetchRange(startDate, endDate) {
    const startISO = toISODate(startDate)
    const endISO = toISODate(endDate)
    const url =
      `${apiBase.value}/registros?userId=${encodeURIComponent(userId.value)}` +
      `&data_gte=${encodeURIComponent(startISO)}` +
      `&data_lte=${encodeURIComponent(endISO)}` +
      `&_sort=data&_order=asc`
    const arr = await _json(url)
    const map = {}
    for (const it of arr) {
      map[it.data] = { pairs: Array.isArray(it.pares) ? it.pares : [], id: it.id }
    }
    return map
  }

  async function preloadRange(startDate, endDate) {
    const map = await fetchRange(startDate, endDate)
    for (const [iso, { pairs, id }] of Object.entries(map)) {
      entries.value[iso] = pairs
      if (id != null) idByDate.value[iso] = id
    }
    return map
  }

  /* ========= Remoto (gravação) com fila e ID determinístico ========= */

  // Serializa operações por chave (evita corrida de PATCH/PUT no mesmo dia)
  function enqueue(key, op) {
    const prev = writeQueues.get(key) || Promise.resolve()
    const next = prev.then(op).finally(() => {
      if (writeQueues.get(key) === next) writeQueues.delete(key)
    })
    writeQueues.set(key, next)
    return next
  }

  // PUT para criar (id determinístico) | PATCH para atualizar (preserva createdAt)
  async function persist(iso) {
    const key = `${userId.value}|${iso}`
    return enqueue(key, async () => {
      const pairs = entries.value[iso] || []
      const totalMin = pairs.reduce((acc, p) => acc + pairMinutes(p), 0)
      const existingId = idByDate.value[iso]

      // Caso 1: já existe (numérico OU string) -> PATCH
      if (existingId != null) {
        await _json(`${apiBase.value}/registros/${encodeURIComponent(existingId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pares: pairs, totalMin, updatedAt: new Date().toISOString() }),
        })
        return
      }

      // Caso 2: não existe -> cria com ID determinístico por (userId,data) via PUT
      const newId = recordId(userId.value, iso)
      // await _json(`${apiBase.value}/registros/${encodeURIComponent(newId)}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     id: newId,
      //     userId: userId.value,
      //     data: iso,
      //     pares: pairs,
      //     totalMin,
      //     createdAt: new Date().toISOString(),
      //     updatedAt: new Date().toISOString(),
      //   }),
      // })
      await _json(`${apiBase.value}/registros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,                 // mantém id string (YYYYMMDD-<userId>)
          userId: userId.value,
          data: iso,
          pares: pairs,
          totalMin,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      })
      idByDate.value[iso] = newId
    })
  }

  /* ========= Helpers locais (imutáveis p/ reatividade) ========= */
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
  function clearAllFromClient() {
    entries.value = {}
    idByDate.value = {}
  }
  // Alias p/ compatibilidade com o componente (mesmo efeito do clearAllFromClient)
  function clearCache() {
    clearAllFromClient()
  }

  async function clearAllFromServer() {
    const url = `${apiBase.value}/registros?userId=${encodeURIComponent(userId.value)}`
    const arr = await _json(url)
    await Promise.all(
      arr.map((it) =>
        fetch(`${apiBase.value}/registros/${encodeURIComponent(it.id)}`, { method: 'DELETE' }),
      ),
    )
    clearAllFromClient()
  }

  return {
    // estado
    apiBase,
    userId,
    entries,
    idByDate,

    // init
    init,

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

    // leitura/gravação
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
  }
})
