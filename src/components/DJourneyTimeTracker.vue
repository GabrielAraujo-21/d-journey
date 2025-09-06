<template>
  <v-card class="mx-auto my-5 pa-5 tracker-card" elevation="10" rounded="xl" max-width="980">
    <div class="d-flex align-center mb-4">
      <v-avatar size="40" class="mr-3" color="primary" rounded="lg">
        <v-icon>mdi-briefcase-clock</v-icon>
      </v-avatar>
      <div>
        <h2 class="text-h6 font-weight-bold mb-0">Jornada de trabalho</h2>
        <div class="text-caption text-medium-emphasis">Registre pares de entrada/saída por dia</div>
      </div>
      <v-spacer />
      <v-btn
        variant="text"
        prepend-icon="mdi-delete-sweep-outline"
        class="text-none"
        @click="clearAll"
      >
        Limpar tudo
      </v-btn>
    </div>

    <!-- SelecaoDiaria -->
    <SelecaoDiaria
      v-model:currentDate="currentDate"
      :pairs="pairs"
      :targetDailyMinutes="targetDailyMinutes"
      :dayTotal="dayTotal"
      :progressDaily="progressDaily"
      :incompleteCount="incompleteCount"
      :invalidCount="invalidCount"
      :nowHM="nowHM"
      :pairMinutes="pairMinutes"
      :isCrossMidnight="isCrossMidnight"
      :isInvalid="isInvalid"
      :invalidMessage="invalidMessage"
      :formatMinutes="formatMinutes"
      :addPair="addPair"
      :sortPairs="sortPairs"
      :clearDay="clearDay"
      :duplicatePair="duplicatePair"
      :removePair="removePair"
      :persistOnBlur="persistOnBlur"
    />

    <!-- SemanaAtual -->
    <SemanaAtual
      :currentWeekStart="currentWeekStart"
      :currentWeek="currentWeek"
      :targetDailyMinutes="targetDailyMinutes"
      :weekLabel="weekLabel"
      :formatMinutes="formatMinutes"
      :pairsLength="pairs.length"
    />

    <!-- HistóricoSemanal -->
    <HistoricoSemanal
      v-model:weeksToShow="weeksToShow"
      :weeklyHistory="weeklyHistory"
      :formatMinutes="formatMinutes"
    />
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import HistoricoSemanal from '@/components/HistoricoSemanal.vue'
import SelecaoDiaria from '@/components/SelecaoDiaria.vue'
import SemanaAtual from '@/components/SemanaAtual.vue'

/**
 * ⚙️ Configurações do componente
 * - startOnMonday: define 2ª-feira como início de semana (Brasil)
 * - targetDailyMinutes: meta diária (8h = 480min)
 * - apiBase/userId: consumo do json-server
 */
const startOnMonday = true
const props = defineProps({
  targetDailyMinutes: { type: Number, default: 480 }, // 8h
  apiBase: { type: String, default: 'http://localhost:3000' }, // ex.: "http://localhost:3000"
  userId: { type: Number, default: 1 },
})
const targetDailyMinutes = computed(() => props.targetDailyMinutes)
const baseUrl = computed(() => props.apiBase.replace(/\/$/, ''))

// Estado base (mantido)
const todayISO = toISODate(new Date())
const currentDate = ref(todayISO)
/** Cache em memória no mesmo formato anterior:
 * { 'YYYY-MM-DD': [ { in:'HH:mm', out:'HH:mm' }, ... ] }
 */
const entries = ref({})
const weeksToShow = ref(6)

/** Mapa para sabermos o id do registro no json-server por data */
const idByDate = ref({}) // { 'YYYY-MM-DD': number }

/** Carrega dados iniciais do servidor:
 * - Dia atual
 * - Faixa necessária para o histórico semanal (N semanas)
 */
onMounted(async () => {
  await ensureDayLoaded(currentDate.value)
  await preloadWeeksRange()
})

/** Ao trocar o dia, garante que os pares desse dia estejam carregados */
watch(currentDate, async (iso) => {
  await ensureDayLoaded(iso)
})

// Pares do dia selecionado (mantido)
const pairs = computed({
  get: () => entries.value[currentDate.value] || [],
  set: (val) => {
    entries.value[currentDate.value] = val
  },
})

/* ----------------------- AÇÕES/UX (mantidas) ----------------------- */
function addPair() {
  pairs.value = [...pairs.value, { in: '', out: '' }]
}
function removePair(index) {
  const arr = [...pairs.value]
  arr.splice(index, 1)
  pairs.value = arr
  // opcional: persistir após remoção
  persistOnBlur()
}
function duplicatePair(index) {
  const p = pairs.value[index]
  pairs.value = [...pairs.value, { in: p.in, out: p.out }]
  // opcional: persistir após duplicar
  persistOnBlur()
}
function sortPairs() {
  pairs.value = [...pairs.value].sort((a, b) => toMinutes(a.in) - toMinutes(b.in))
  // opcional: persistir após ordenar
  persistOnBlur()
}
function clearDay() {
  pairs.value = []
  // persistir ao limpar o dia
  persistOnBlur()
}
async function clearAll() {
  if (!confirm('Tem certeza que deseja apagar todos os registros?')) return
  try {
    // Deleta todos os registros do usuário
    const url = `${baseUrl.value}/registros?userId=${encodeURIComponent(props.userId)}`
    const res = await fetch(url)
    const arr = await res.json()
    await Promise.all(
      arr.map((it) => fetch(`${baseUrl.value}/registros/${it.id}`, { method: 'DELETE' })),
    )
  } finally {
    entries.value = {}
    idByDate.value = {}
    entries.value[currentDate.value] = []
  }
}

/* ----------------------- Persistência no blur ----------------------- */
async function persistOnBlur() {
  try {
    await ensureDayLoaded(currentDate.value) // garante idByDate quando houver
    await saveDay(currentDate.value, entries.value[currentDate.value] || [])
  } catch (e) {
    console.error('Falha ao persistir marcação:', e)
  }
}

/* ----------------------- Utilidades de tempo (mantidas) ----------------------- */
function nowHM() {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
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
  if (diff < 0) diff += 24 * 60 // cruza meia-noite
  return Math.max(0, diff)
}
function formatMinutes(mins) {
  const m = Math.max(0, Math.round(mins || 0))
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return `${h}h ${mm}m`
}
function isCrossMidnight(p) {
  const a = toMinutes(p.in)
  const b = toMinutes(p.out)
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  return b - a < 0
}

/* ----------------------- Validações (mantidas) ----------------------- */
const incompleteCount = computed(() => pairs.value.filter((p) => !(p.in && p.out)).length)
const invalidCount = computed(
  () =>
    pairs.value.filter((p) => {
      if (!(p.in && p.out)) return false
      const a = toMinutes(p.in)
      const b = toMinutes(p.out)
      if (Number.isNaN(a) || Number.isNaN(b)) return true
      const diff = (b - a + 24 * 60) % (24 * 60)
      return diff === 0 || diff > 16 * 60
    }).length,
)
function isInvalid(index) {
  const p = pairs.value[index]
  if (!(p.in && p.out)) return false
  const a = toMinutes(p.in)
  const b = toMinutes(p.out)
  if (Number.isNaN(a) || Number.isNaN(b)) return true
  const diff = (b - a + 24 * 60) % (24 * 60)
  return diff === 0 || diff > 16 * 60
}
function invalidMessage(index) {
  return isInvalid(index) ? 'Par inválido (verifique os horários)' : ''
}

/* ----------------------- Totais + progresso (mantidos) ----------------------- */
const dayTotal = computed(() => pairs.value.reduce((acc, p) => acc + pairMinutes(p), 0))
const progressDaily = computed(() => (dayTotal.value / targetDailyMinutes.value) * 100)

/* ----------------------- Helpers de semana (mantidos) ----------------------- */
function getWeekStart(d) {
  const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = tmp.getDay() // 0=Dom
  const diff = startOnMonday ? (day === 0 ? 6 : day - 1) : day
  tmp.setDate(tmp.getDate() - diff)
  tmp.setHours(0, 0, 0, 0)
  return tmp
}
function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
function weekLabel(start) {
  const end = addDays(start, 6)
  return `${formatShort(start)} – ${formatShort(end)}`
}
function formatShort(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}
function weekdayLabel(idx) {
  const listMon = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const listSun = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return startOnMonday ? listMon[idx] : listSun[idx]
}
function dateISOAtWeekOffset(baseStart, dayIdx) {
  return toISODate(addDays(baseStart, dayIdx))
}
function totalOfDate(iso) {
  const dayPairs = entries.value[iso] || []
  return dayPairs.reduce((acc, p) => acc + pairMinutes(p), 0)
}

// Semana atual (mantida)
const currentWeekStart = computed(() => getWeekStart(new Date(currentDate.value)))
const currentWeek = computed(() => {
  const days = Array.from({ length: 7 }).map((_, i) => {
    const iso = dateISOAtWeekOffset(currentWeekStart.value, i)
    const total = totalOfDate(iso)
    const d = addDays(currentWeekStart.value, i)
    return { iso, total, label: weekdayLabel(i), dateLabel: formatShort(d) }
  })
  const total = days.reduce((a, b) => a + b.total, 0)
  const daysWorked = days.filter((d) => d.total > 0).length
  return { total, daysWorked, avgPerDay: daysWorked ? total / daysWorked : 0, days }
})

// Histórico (mantido)
const weeklyHistory = computed(() => {
  const list = []
  const baseStart = getWeekStart(new Date()) // base: semana atual do "hoje"
  for (let i = 0; i < weeksToShow.value; i++) {
    const start = addDays(baseStart, -7 * i)
    const end = addDays(start, 6)
    const totals = Array.from({ length: 7 }).map((_, dIdx) =>
      totalOfDate(toISODate(addDays(start, dIdx))),
    )
    const total = totals.reduce((a, b) => a + b, 0)
    const daysWorked = totals.filter((v) => v > 0).length
    const avgPerDay = daysWorked ? total / daysWorked : 0
    list.push({
      key: `${toISODate(start)}_${toISODate(end)}`,
      label: `${formatShort(start)} – ${formatShort(end)}`,
      total,
      daysWorked,
      avgPerDay,
    })
  }
  return list
})

/* ----------------------- API (json-server) ----------------------- */

// Garante cache para o dia (e captura id se já existir)
async function ensureDayLoaded(iso) {
  if (iso in entries.value) return
  const { pairs, id } = await fetchDay(iso)
  entries.value[iso] = pairs
  if (id != null) idByDate.value[iso] = id
}

// Pré-carrega faixa para histórico semanal (N semanas)
async function preloadWeeksRange() {
  const baseStart = getWeekStart(new Date())
  const start = addDays(baseStart, -7 * (weeksToShow.value - 1))
  const end = addDays(baseStart, 6)
  const map = await fetchRange(start, end)
  for (const [iso, { pairs, id }] of Object.entries(map)) {
    entries.value[iso] = pairs
    if (id != null) idByDate.value[iso] = id
  }
  if (!(currentDate.value in entries.value)) {
    entries.value[currentDate.value] = []
  }
}

/** GET /registros?userId&data=YYYY-MM-DD&_limit=1 */
async function fetchDay(iso) {
  const url = `${baseUrl.value}/registros?userId=${encodeURIComponent(props.userId)}&data=${encodeURIComponent(iso)}&_limit=1`
  const res = await fetch(url)
  const arr = await res.json()
  if (Array.isArray(arr) && arr.length) {
    const it = arr[0]
    return { pairs: Array.isArray(it.pares) ? it.pares : [], id: it.id }
  }
  return { pairs: [], id: null }
}

/** GET /registros?userId&data_gte&data_lte */
async function fetchRange(startDate, endDate) {
  const startISO = toISODate(startDate)
  const endISO = toISODate(endDate)
  const url =
    `${baseUrl.value}/registros?userId=${encodeURIComponent(props.userId)}` +
    `&data_gte=${encodeURIComponent(startISO)}` +
    `&data_lte=${encodeURIComponent(endISO)}` +
    `&_sort=data&_order=asc`
  const res = await fetch(url)
  const arr = await res.json()
  const map = {}
  for (const it of arr) {
    map[it.data] = { pairs: Array.isArray(it.pares) ? it.pares : [], id: it.id }
  }
  return map
}

/** POST/PUT conforme existir id para a data (chave: userId + data) */
async function saveDay(iso, pairs) {
  const totalMin = pairs.reduce((acc, p) => acc + pairMinutes(p), 0)
  const existingId = idByDate.value[iso]
  if (existingId) {
    const res = await fetch(`${baseUrl.value}/registros/${existingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pares: pairs, totalMin, updatedAt: new Date().toISOString() }),
    })
    if (!res.ok) throw new Error(`PATCH ${res.status}`)
    return
  }
  // cria novo registro (chave lógica = userId + data)
  const res = await fetch(`${baseUrl.value}/registros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: props.userId,
      data: iso,
      pares: pairs,
      totalMin,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(`POST ${res.status}`)
  const created = await res.json()
  idByDate.value[iso] = created.id
}
</script>

<style scoped>
.tracker-card {
  backdrop-filter: saturate(1.1) blur(8px);
  border: 1px solid color-mix(in oklab, rgb(var(--v-theme-on-surface)) 12%, transparent);
  background:
    radial-gradient(1200px 800px at 100% -20%, rgba(var(--v-theme-primary), 0.08), transparent 60%),
    radial-gradient(
      1000px 600px at -10% 110%,
      rgba(var(--v-theme-secondary), 0.08),
      transparent 55%
    ),
    linear-gradient(180deg, rgb(var(--v-theme-surface)) 0%, rgb(var(--v-theme-background)) 100%);
}
</style>
