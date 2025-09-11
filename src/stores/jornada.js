// src/stores/jornada.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useRegistrosStore } from '@/stores/registros'
import {
  todayISO,
  toISODate,
  toMinutes,
  addDays,
  getWeekStart,
  dateISOAtWeekOffset,
  formatShort,
  pairMinutes,
} from '@/plugins/dates'

export const useJornadaStore = defineStore('jornada', () => {
  const reg = useRegistrosStore()

  const userId = ref(null)
  const apiBase = ref('')
  const targetDailyMinutes = ref(480)

  const currentDate = ref(todayISO())
  const weeksToShow = ref(4)

  function init({ userId: uid, apiBase: base, target = 480 } = {}) {
    const next = Number(uid) || null
    const changed = next !== userId.value

    userId.value = next
    apiBase.value = (base || '').replace(/\/$/, '')
    targetDailyMinutes.value = Number(target) || 480

    if (changed) {
      // não existe switchUser no store de registros;
      // faça o equivalente: limpar cache e reconfigurar o store
      reg.clearCache()
      reg.init({ userId: userId.value, apiBase: apiBase.value })
      currentDate.value = todayISO()
    } else {
      reg.init({ userId: userId.value, apiBase: apiBase.value })
    }
  }

  async function switchUser(uid, base) {
    init({ userId: uid, apiBase: base, target: targetDailyMinutes.value })
    await ensureCurrentDayLoaded()
    await preloadWeeksRange()
  }

  // ---------- Derivados ----------
  const pairs = computed(() => reg.entries[currentDate.value] || [])
  const dayTotal = computed(() => pairs.value.reduce((acc, p) => acc + pairMinutes(p), 0))
  const progressDaily = computed(() =>
    targetDailyMinutes.value > 0 ? (dayTotal.value / targetDailyMinutes.value) * 100 : 0,
  )
  const incompleteCount = computed(() => pairs.value.filter((p) => !(p.in && p.out)).length)
  const invalidCount = computed(
    () =>
      pairs.value.filter((p) => {
        if (!(p.in && p.out)) return false
        const a = toMinutes(p.in),
          b = toMinutes(p.out)
        if (Number.isNaN(a) || Number.isNaN(b)) return true
        const diff = (b - a + 24 * 60) % (24 * 60)
        return diff === 0 || diff > 16 * 60
      }).length,
  )

  const currentWeekStart = computed(() => getWeekStart(currentDate.value))
  function totalOfDate(iso) {
    const arr = reg.entries[iso] || []
    return arr.reduce((acc, p) => acc + pairMinutes(p), 0)
  }
  const currentWeek = computed(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const iso = dateISOAtWeekOffset(currentWeekStart.value, i)
      return {
        iso,
        total: totalOfDate(iso),
        label: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][new Date(iso).getDay()],
        dateLabel: formatShort(addDays(currentWeekStart.value, i)),
      }
    })
    const total = days.reduce((a, b) => a + b.total, 0)
    const daysWorked = days.filter((d) => d.total > 0).length
    return { total, daysWorked, avgPerDay: daysWorked ? total / daysWorked : 0, days }
  })

  const weeklyHistory = computed(() => {
    const list = []
    const baseStart = currentWeekStart.value // ***era new Date()***
    for (let i = 0; i < Math.max(1, weeksToShow.value); i++) {
      const start = addDays(baseStart, -7 * i)
      const end = addDays(start, 6)
      const totals = Array.from({ length: 7 }).map((_, dIdx) => {
        const iso = dateISOAtWeekOffset(start, dIdx)
        const arr = reg.entries[iso] || []
        return arr.reduce((acc, p) => acc + pairMinutes(p), 0)
      })
      const total = totals.reduce((a, b) => a + b, 0)
      const daysWorked = totals.filter((v) => v > 0).length
      list.push({
        key: `${toISODate(start)}_${toISODate(end)}`,
        label: `${formatShort(start)} – ${formatShort(end)}`,
        total,
        daysWorked,
        avgPerDay: daysWorked ? total / daysWorked : 0,
      })
    }
    return list
    // const list = []
    // const baseStart = getWeekStart(new Date())
    // for (let i = 0; i < weeksToShow.value; i++) {
    //   const start = addDays(baseStart, -7 * i)
    //   const end = addDays(start, 6)
    //   const totals = Array.from({ length: 7 }).map((_, dIdx) =>
    //     (reg.entries[dateISOAtWeekOffset(start, dIdx)] || []).reduce(
    //       (acc, p) => acc + pairMinutes(p),
    //       0,
    //     ),
    //   )
    //   const total = totals.reduce((a, b) => a + b, 0)
    //   const daysWorked = totals.filter((v) => v > 0).length
    //   list.push({
    //     key: `${toISODate(start)}_${toISODate(end)}`,
    //     label: `${formatShort(start)} – ${formatShort(end)}`,
    //     total,
    //     daysWorked,
    //     avgPerDay: daysWorked ? total / daysWorked : 0,
    //   })
    // }
    // return list
  })

  // ---------- IO ----------
  async function ensureCurrentDayLoaded() {
    await reg.ensureDayLoaded(currentDate.value)
  }
  async function preloadWeeksRange() {
    // const baseStart = getWeekStart(currentDate.value)
    // const start = addDays(baseStart, -7 * (Math.max(1, weeksToShow.value) - 1))
    // const end = addDays(baseStart, 6)
    // await reg.preloadRange(start, end)
    // if (!(currentDate.value in reg.entries)) reg.setPairs(currentDate.value, [])
    const baseStart = currentWeekStart.value
    const start = addDays(baseStart, -7 * (Math.max(1, weeksToShow.value) - 1))
    const end = addDays(baseStart, 6)
    await reg.preloadRange(start, end)
    if (!(currentDate.value in reg.entries)) reg.setPairs(currentDate.value, [])
  }

  // se quiser: re-hidratar quando mudar a data/semana
  watch(currentDate, ensureCurrentDayLoaded)
  // watch(weeksToShow, preloadWeeksRange)
  watch([currentWeekStart, weeksToShow], preloadWeeksRange, { immediate: true })

  // ---------- Ações ----------
  function setPairs(val) {
    reg.setPairs(currentDate.value, val)
  }
  async function addPair() {
    reg.addPair(currentDate.value, { in: '', out: '' })
    await reg.persist(currentDate.value)
  }
  function removePair(i) {
    reg.removePairAt(currentDate.value, i)
  }
  function duplicatePair(i) {
    reg.duplicatePairAt(currentDate.value, i)
  }
  function sortPairs() {
    reg.sortPairsAsc(currentDate.value)
  }
  function clearDay() {
    reg.clearDay(currentDate.value)
  }
  async function persist() {
    await reg.persist(currentDate.value)
  }
  async function clearAll() {
    await reg.clearAllFromServer()
    reg.clearCache()
    reg.setPairs(currentDate.value, [])
  }

  return {
    // params
    userId,
    apiBase,
    targetDailyMinutes,
    // ui
    currentDate,
    weeksToShow,
    // derivados
    pairs,
    dayTotal,
    progressDaily,
    incompleteCount,
    invalidCount,
    currentWeekStart,
    currentWeek,
    weeklyHistory,
    // ciclo
    init,
    switchUser,
    ensureCurrentDayLoaded,
    preloadWeeksRange,
    // comandos
    setPairs,
    addPair,
    removePair,
    duplicatePair,
    sortPairs,
    clearDay,
    persist,
    clearAll,
  }
})
