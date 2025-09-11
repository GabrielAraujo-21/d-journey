// src/stores/registros.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@/services/api' // <— alterna dev/prod sob o capô

export const useRegistrosStore = defineStore('registros', () => {
  const apiBase = ref('http://localhost:3000') // preservado p/ compatibilidade externa (não usado em prod)
  const userId = ref(null)

  const entries = ref({}) // { 'YYYY-MM-DD': [ { in, out }, ... ] }
  const idByDate = ref({}) // { 'YYYY-MM-DD': <id> }

  const writeQueues = new Map()

  function init({ userId: uid, apiBase: base } = {}) {
    if (uid != null) userId.value = Number(uid)
    if (base) apiBase.value = String(base).replace(/\/$/, '')
  }

  /* ========= Utils ========= */
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
    const day = tmp.getDay()
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
    if (diff < 0) diff += 24 * 60
    return Math.max(0, diff)
  }

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

  /* ========= Gravação com fila ========= */
  function enqueue(key, op) {
    const prev = writeQueues.get(key) || Promise.resolve()
    const next = prev.then(op).finally(() => {
      if (writeQueues.get(key) === next) writeQueues.delete(key)
    })
    writeQueues.set(key, next)
    return next
  }

  async function persist(iso) {
    const key = `${userId.value}|${iso}`
    return enqueue(key, async () => {
      const pairs = entries.value[iso] || []
      const totalMin = pairs.reduce((acc, p) => acc + pairMinutes(p), 0)
      const existingId = idByDate.value[iso]

      // Atualiza
      if (existingId != null) {
        await http.patch(`/registros/${encodeURIComponent(existingId)}`, {
          pares: pairs,
          totalMin,
          updatedAt: new Date().toISOString(),
        })
        return
      }

      // Cria com ID determinístico
      const newId = recordId(userId.value, iso)
      await http.post('/registros', {
        id: newId,
        userId: userId.value,
        data: iso,
        pares: pairs,
        totalMin,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      idByDate.value[iso] = newId
    })
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
  function clearAllFromClient() {
    entries.value = {}
    idByDate.value = {}
  }
  function clearCache() {
    clearAllFromClient()
  }

  async function clearAllFromServer() {
    const arr = await http.get('/registros', { search: { userId: userId.value } })
    await Promise.all(arr.map((it) => http.delete(`/registros/${encodeURIComponent(it.id)}`)))
    clearAllFromClient()
  }

  function switchUser(uid, base) {
    // Limpa tudo do usuário anterior e aponta para o novo
    clearAllFromClient()
    init({ userId: uid, apiBase: base })
  }

  return {
    // estado
    apiBase,
    userId,
    entries,
    idByDate,

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
