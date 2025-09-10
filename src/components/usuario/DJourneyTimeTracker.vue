<template>
  <div class="bg-surface-variant mb-6">
    <!-- <v-container> -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mx-auto pa-5 tracker-card" elevation="10" rounded="xl">
          <div class="d-flex align-center mb-3">
            <v-avatar size="40" class="mr-3" color="primary" rounded="lg">
              <v-icon>mdi-briefcase-clock</v-icon>
            </v-avatar>
            <div>
              <h2 class="text-h6 font-weight-bold mb-0">Jornada de trabalho</h2>
              <div class="text-caption text-medium-emphasis text-secondary">
                Registre pares de entrada/saída por dia
              </div>
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
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="mx-auto pa-5 tracker-card" elevation="10" rounded="xl">
          <SemanaAtual
            :currentWeekStart="currentWeekStart"
            :currentWeek="currentWeek"
            :targetDailyMinutes="targetDailyMinutes"
            :weekLabel="weekLabel"
            :formatMinutes="formatMinutes"
            :pairsLength="pairs.length"
          />
        </v-card>
        <v-card class="mx-auto my-5 pa-5 tracker-card" elevation="10" rounded="xl">
          <HistoricoSemanal
            v-model:weeksToShow="weeksToShow"
            :weeklyHistory="weeklyHistory"
            :formatMinutes="formatMinutes"
          />
        </v-card>
      </v-col>
    </v-row>
    <!-- </v-container> -->
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import HistoricoSemanal from '@/components/usuario/HistoricoSemanal.vue'
import SelecaoDiaria from '@/components/usuario/SelecaoDiaria.vue'
import SemanaAtual from '@/components/usuario/SemanaAtual.vue'
import { useRegistrosStore } from '@/stores/registros'
import {
  todayISO,
  toISODate,
  toMinutes,
  nowHM,
  addDays,
  getWeekStart,
  weekLabel,
  formatShort,
  dateISOAtWeekOffset,
  isCrossMidnight,
  pairMinutes, // mantém assinatura original
  // pairMinutesTz, // opcional: versão com TZ
  formatMinutes,
} from '@/plugins/dates'

import { useUserStore } from '@/stores/user'
const userStore = useUserStore()

/* Configurações (mantidas). Em produção, o store usa localStorage; apiBase é irrelevante. */
const startOnMonday = true
const props = defineProps({
  targetDailyMinutes: { type: Number, default: 480 },
  apiBase: { type: String, default: 'http://localhost:3000' },
  userId: { type: Number, default: 1 },
})
const targetDailyMinutes = computed(() => props.targetDailyMinutes)
const baseUrl = computed(() => props.apiBase.replace(/\/$/, ''))

/* Estado base (mantido) */
const currentDate = ref(todayISO())
const weeksToShow = ref(6)

/* Store de registros (usa http unificado por baixo) */
const reg = useRegistrosStore()
reg.init({ userId: props.userId, apiBase: baseUrl.value })

/* Carrega dados iniciais */
onMounted(async () => {
  await reg.ensureDayLoaded(currentDate.value)
  await preloadWeeksRange()
})

/* Recarrega quando o dia muda */
watch(currentDate, async (iso) => {
  await reg.ensureDayLoaded(iso)
})

/* Pares do dia selecionado (mantido) */
const pairs = computed({
  get: () => reg.entries[currentDate.value] || [],
  set: (val) => reg.setPairs(currentDate.value, val),
})

/* ===== AÇÕES/UX (mesma lógica; agora via store helpers) ===== */
async function addPair() {
  reg.addPair(currentDate.value, { in: '', out: '' })
  await reg.persist(currentDate.value)
}
function removePair(index) {
  reg.removePairAt(currentDate.value, index)
  persistOnBlur()
}
function duplicatePair(index) {
  reg.duplicatePairAt(currentDate.value, index)
  persistOnBlur()
}
function sortPairs() {
  reg.sortPairsAsc(currentDate.value)
  persistOnBlur()
}
function clearDay() {
  reg.clearDay(currentDate.value)
  persistOnBlur()
}
async function clearAll() {
  if (!confirm('Tem certeza que deseja apagar todos os registros?')) return
  try {
    await reg.clearAllFromServer() // em prod, limpa do localStorage
  } finally {
    reg.clearCache()
    reg.setPairs(currentDate.value, [])
  }
}

/* ===== Persistência ===== */
async function persistOnBlur() {
  try {
    await reg.persist(currentDate.value)
  } catch (e) {
    console.error('Falha ao persistir marcação:', e)
  }
}

/* ===== Validações (iguais) ===== */
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

/* ===== Totais + progresso (iguais) ===== */
const dayTotal = computed(() => pairs.value.reduce((acc, p) => acc + pairMinutes(p), 0))
const progressDaily = computed(() => (dayTotal.value / targetDailyMinutes.value) * 100)

/* ===== Semana/HIST (iguais) ===== */
function weekdayLabel(idx) {
  const listMon = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const listSun = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return startOnMonday ? listMon[idx] : listSun[idx]
}
function totalOfDate(iso) {
  const dayPairs = reg.entries[iso] || []
  return dayPairs.reduce((acc, p) => acc + pairMinutes(p), 0)
}
const currentWeekStart = computed(() => getWeekStart(currentDate.value))

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

const weeklyHistory = computed(() => {
  const list = []
  const baseStart = getWeekStart(new Date())
  for (let i = 0; i < weeksToShow.value; i++) {
    const start = addDays(baseStart, -7 * i)
    const end = addDays(start, 6)
    const totals = Array.from({ length: 7 }).map((_, dIdx) =>
      (reg.entries[dateISOAtWeekOffset(start, dIdx)] || []).reduce(
        (acc, p) => acc + pairMinutes(p),
        0,
      ),
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

/* Pré-carrega faixa do histórico semanal */
async function preloadWeeksRange() {
  const baseStart = getWeekStart(currentDate.value)
  const start = addDays(baseStart, -7 * (weeksToShow.value - 1))
  const end = addDays(baseStart, 6)
  await reg.preloadRange(start, end)
  if (!(currentDate.value in reg.entries)) {
    reg.setPairs(currentDate.value, [])
  }
}

watch(
  currentWeekStart,
  async (start) => {
    const end = addDays(start, 6)
    try {
      await reg.preloadRange(start, end)
    } catch (e) {
      console.warn('Falha ao pré-carregar semana:', e)
    }
  },
  { immediate: true },
)
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
