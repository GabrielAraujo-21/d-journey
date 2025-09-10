<template>
  <div class="bg-surface-variant pa-7">
    <v-card class="mx-auto my-5 pa-7" elevation="10" rounded="xl" max-width="980">
      <div class="d-flex align-center mb-4">
        <v-avatar size="40" class="mr-3" color="primary" rounded="lg">
          <v-icon>mdi-calendar-clock</v-icon>
        </v-avatar>
        <div>
          <h2 class="text-h6 font-weight-bold mb-0">Histórico mensal</h2>
          <div class="text-caption text-medium-emphasis text-secondary">
            Último mês fechado e mês atual (marcações diárias)
          </div>
        </div>
        <v-spacer />
        <v-chip class="mr-2" variant="tonal" prepend-icon="mdi-account-clock" color="primary">
          ID: #{{ userStore.id }} - Nome: {{ userStore.name }}
        </v-chip>
        <v-chip variant="tonal" color="secondary" prepend-icon="mdi-cloud-sync"> API </v-chip>
      </div>

      <!-- <v-alert
      v-if="!apiBase"
      type="error"
      variant="tonal"
      class="mb-4"
      text="É necessário informar a prop 'apiBase' (ex.: http://localhost:3000)."
    /> -->

      <v-tabs v-model="tab" class="mb-3">
        <v-tab value="atual">
          <v-icon start>mdi-calendar-month</v-icon>
          {{ labelMesAtual }}
        </v-tab>
        <v-tab value="anterior">
          <v-icon start>mdi-calendar-month-outline</v-icon>
          {{ labelMesAnterior }}
        </v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <!-- MÊS ATUAL -->
        <v-window-item value="atual">
          <v-sheet border rounded="xl" class="pa-4">
            <div class="d-flex flex-wrap align-center mb-3">
              <h3 class="text-subtitle-1 font-weight-medium mb-0">
                {{ labelMesAtual }} — {{ periodoAtual }}
              </h3>
              <v-spacer />
              <v-chip variant="flat" color="primary" class="mr-2" prepend-icon="mdi-timer-sand">
                Total: {{ formatMinutes(stateAtual.total) }}
              </v-chip>
              <v-chip variant="tonal" prepend-icon="mdi-briefcase-check">
                Dias trabalhados: {{ stateAtual.daysWorked }} / {{ stateAtual.days.length }}
              </v-chip>
            </div>

            <v-skeleton-loader
              v-if="loadingAtual"
              type="list-item-two-line, list-item-two-line, list-item-two-line, list-item-two-line, list-item-two-line"
            />

            <template v-else>
              <v-alert
                v-if="errorAtual"
                type="error"
                variant="tonal"
                class="mb-3"
                :text="errorAtual"
              />
              <v-alert
                v-else-if="stateAtual.days.length === 0"
                type="info"
                variant="tonal"
                class="mb-3"
                text="Sem dias neste período."
              />
              <v-expansion-panels multiple>
                <v-expansion-panel v-for="d in stateAtual.days" :key="d.iso" rounded="lg">
                  <v-expansion-panel-title>
                    <div class="w-100 d-flex align-center">
                      <div class="text-body-1 font-weight-medium">
                        {{ d.weekday }}, {{ d.dateLabel }}
                      </div>
                      <v-spacer />
                      <v-chip size="small" variant="tonal" class="mr-2">
                        {{ d.pairsCount }} {{ d.pairsCount === 1 ? 'par' : 'pares' }}
                      </v-chip>
                      <v-chip size="small" color="primary" variant="flat">
                        {{ formatMinutes(d.total) }}
                      </v-chip>
                    </div>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div v-if="d.pairsCount === 0" class="text-medium-emphasis">Sem marcações.</div>
                    <v-row v-else class="gap-y-2">
                      <v-col v-for="(p, i) in d.pares" :key="i" cols="12" sm="6" md="4">
                        <v-card variant="tonal" rounded="lg" class="pa-3">
                          <div class="d-flex align-center">
                            <v-icon class="mr-2">mdi-login-variant</v-icon>
                            <span class="mr-4">{{ p.in }}</span>
                            <v-icon class="mr-2">mdi-logout-variant</v-icon>
                            <span>{{ p.out }}</span>
                            <v-spacer />
                            <v-chip size="x-small" variant="tonal">
                              {{ formatMinutes(pairMinutes(p)) }}
                            </v-chip>
                          </div>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </template>
          </v-sheet>
        </v-window-item>

        <!-- MÊS ANTERIOR (FECHADO) -->
        <v-window-item value="anterior">
          <v-sheet border rounded="xl" class="pa-4">
            <div class="d-flex flex-wrap align-center mb-3">
              <h3 class="text-subtitle-1 font-weight-medium mb-0">
                {{ labelMesAnterior }} — {{ periodoAnterior }}
              </h3>
              <v-spacer />
              <v-chip variant="flat" color="primary" class="mr-2" prepend-icon="mdi-timer-sand">
                Total: {{ formatMinutes(stateAnterior.total) }}
              </v-chip>
              <v-chip variant="tonal" prepend-icon="mdi-briefcase-check">
                Dias trabalhados: {{ stateAnterior.daysWorked }} / {{ stateAnterior.days.length }}
              </v-chip>
            </div>

            <v-skeleton-loader
              v-if="loadingAnterior"
              type="list-item-two-line, list-item-two-line, list-item-two-line, list-item-two-line, list-item-two-line"
            />

            <template v-else>
              <v-alert
                v-if="errorAnterior"
                type="error"
                variant="tonal"
                class="mb-3"
                :text="errorAnterior"
              />
              <v-alert
                v-else-if="stateAnterior.days.length === 0"
                type="info"
                variant="tonal"
                class="mb-3"
                text="Sem dias neste período."
              />
              <v-expansion-panels multiple>
                <v-expansion-panel v-for="d in stateAnterior.days" :key="d.iso" rounded="lg">
                  <v-expansion-panel-title>
                    <div class="w-100 d-flex align-center">
                      <div class="text-body-1 font-weight-medium">
                        {{ d.weekday }}, {{ d.dateLabel }}
                      </div>
                      <v-spacer />
                      <v-chip size="small" variant="tonal" class="mr-2">
                        {{ d.pairsCount }} {{ d.pairsCount === 1 ? 'par' : 'pares' }}
                      </v-chip>
                      <v-chip size="small" color="primary" variant="flat">
                        {{ formatMinutes(d.total) }}
                      </v-chip>
                    </div>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div v-if="d.pairsCount === 0" class="text-medium-emphasis">Sem marcações.</div>
                    <v-row v-else class="gap-y-2">
                      <v-col v-for="(p, i) in d.pares" :key="i" cols="12" sm="6" md="4">
                        <v-card variant="tonal" rounded="lg" class="pa-3">
                          <div class="d-flex align-center">
                            <v-icon class="mr-2">mdi-login-variant</v-icon>
                            <span class="mr-4">{{ p.in }}</span>
                            <v-icon class="mr-2">mdi-logout-variant</v-icon>
                            <span>{{ p.out }}</span>
                            <v-spacer />
                            <v-chip size="x-small" variant="tonal">
                              {{ formatMinutes(pairMinutes(p)) }}
                            </v-chip>
                          </div>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </template>
          </v-sheet>
        </v-window-item>
      </v-window>
    </v-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRegistrosStore } from '@/stores/registros'

const userStore = useUserStore()

const props = defineProps({
  userId: { type: Number, default: 1 },
  apiBase: { type: String, default: 'http://localhost:3000' },
  order: { type: String, default: 'desc', validator: (v) => ['asc', 'desc'].includes(v) },
  startOnMonday: { type: Boolean, default: true },
})

const baseUrl = computed(() => {
  if (import.meta.env.MODE === 'production') return '' // ignorado no modo localStorage
  return (
    import.meta.env.VITE_API_URL || // .env.development
    props.apiBase || // fallback por prop
    'http://localhost:3000'
  ) // fallback final
    .replace(/\/$/, '')
})

// const apiBase = computed(() => props.apiBase?.replace(/\/$/, '') || '')
const tab = ref('atual')

// Datas base (mantidas)
const today = new Date()
const { start: startAtual, end: endAtual } = monthRangeCurrent(today)
const { start: startAnterior, end: endAnterior } = monthRangePrevious(today)

const labelMesAtual = computed(() => monthLabel(startAtual))
const labelMesAnterior = computed(() => monthLabel(startAnterior))
const periodoAtual = computed(() => `${formatShort(startAtual)} – ${formatShort(endAtual)}`)
const periodoAnterior = computed(
  () => `${formatShort(startAnterior)} – ${formatShort(endAnterior)}`,
)

const stateAtual = reactive({ days: [], total: 0, daysWorked: 0 })
const stateAnterior = reactive({ days: [], total: 0, daysWorked: 0 })
const loadingAtual = ref(false)
const loadingAnterior = ref(false)
const errorAtual = ref('')
const errorAnterior = ref('')

// Store de registros (só para buscar a faixa e reaproveitar cache se quiser)
const reg = useRegistrosStore()
reg.init({ userId: props.userId, apiBase: baseUrl.value })

onMounted(async () => {
  // if (!apiBase.value) return
  loadingAtual.value = true
  loadingAnterior.value = true
  errorAtual.value = ''
  errorAnterior.value = ''
  try {
    const [atual, anterior] = await Promise.all([
      buildMonthData(startAtual, endAtual, props.order),
      buildMonthData(startAnterior, endAnterior, props.order),
    ])
    Object.assign(stateAtual, atual)
    Object.assign(stateAnterior, anterior)
  } finally {
    loadingAtual.value = false
    loadingAnterior.value = false
  }
})

async function buildMonthData(startDate, endDate, order) {
  const mapWithIds = await reg.fetchRange(startDate, endDate).catch((e) => {
    const msg = e?.message || 'Falha ao buscar registros'
    if (toISODate(startDate) === toISODate(startAtual)) errorAtual.value = msg
    else errorAnterior.value = msg
    return {}
  })

  // adaptamos para o mesmo shape esperado: { iso: pares[] }
  const map = {}
  for (const [iso, obj] of Object.entries(mapWithIds)) map[iso] = obj.pairs || []

  const days = []
  let cursor = new Date(startDate)
  while (cursor <= endDate) {
    const iso = toISODate(cursor)
    const pares = map[iso] || []
    const total = pares.reduce((acc, p) => acc + pairMinutes(p), 0)
    days.push({
      iso,
      dateLabel: formatShort(cursor),
      weekday: weekdayLabel(cursor),
      total,
      pairsCount: pares.length,
      pares,
    })
    cursor = addDays(cursor, 1)
  }
  if (order === 'desc') days.reverse()

  const total = days.reduce((a, b) => a + b.total, 0)
  const daysWorked = days.filter((d) => d.total > 0).length
  return { days, total, daysWorked }
}

/* ===== Utils (mesma lógica) ===== */
function monthRangeCurrent(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  normalize(start)
  normalize(end)
  return { start, end }
}
function monthRangePrevious(d) {
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  const start = new Date(prev.getFullYear(), prev.getMonth(), 1)
  const end = new Date(prev.getFullYear(), prev.getMonth() + 1, 0)
  normalize(start)
  normalize(end)
  return { start, end }
}
function monthLabel(d) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
}
function weekdayLabel(d) {
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return names[d.getDay()]
}
function formatShort(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}
function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return normalize(d)
}
function normalize(d) {
  d.setHours(0, 0, 0, 0)
  return d
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
  if (diff < 0) diff += 24 * 60
  return Math.max(0, diff)
}
function formatMinutes(mins) {
  const m = Math.max(0, Math.round(mins || 0))
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return `${h}h ${mm}m`
}
</script>

<style scoped>
.v-expansion-panel-title {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
</style>
