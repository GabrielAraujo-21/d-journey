<!-- src/components/usuario/HistoricoMensal.vue -->
<template>
  <div class="pa-7">
    <v-card class="mx-auto my-5 pa-7 tracker-card" elevation="10" rounded="xl" max-width="980">
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
          ID: #{{ safeUser.id }} - Nome: {{ safeUser.name }}
        </v-chip>

        <v-chip variant="tonal" color="secondary" prepend-icon="mdi-cloud-sync"> API </v-chip>
      </div>

      <v-tabs v-model="tab" class="mb-3">
        <v-tab value="atual"><v-icon start>mdi-calendar-month</v-icon>{{ labelMesAtual }}</v-tab>
        <v-tab value="anterior">
          <v-icon start>mdi-calendar-month-outline</v-icon>{{ labelMesAnterior }}
        </v-tab>
      </v-tabs>

      <v-divider class="mb-4" />

      <!-- Filtro global de pendências -->
      <div class="d-flex align-center mb-2">
        <v-switch
          v-model="showOnlyPending"
          inset
          hide-details
          color="primary"
          :label="`Somente pendentes (${pendingStatuses.join(', ')})`"
        />
        <v-tooltip
          location="bottom"
          text="Mostra apenas dias em que é esperado ação (ex.: 'enviado')"
        >
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" icon class="ml-1" density="compact">
              <v-icon>mdi-information-outline</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-spacer />

        <!-- Ordenação local -->
        <v-btn-toggle v-model="orderModel" density="comfortable" rounded="lg" divided>
          <v-btn value="desc" :aria-label="'Mais recentes primeiro'">
            <v-icon start>mdi-sort-descending</v-icon>Recente
          </v-btn>
          <v-btn value="asc" :aria-label="'Mais antigos primeiro'">
            <v-icon start>mdi-sort-ascending</v-icon>Antigo
          </v-btn>
        </v-btn-toggle>
      </div>

      <v-window v-model="tab">
        <!-- ATUAL -->
        <v-window-item value="atual">
          <v-sheet border rounded="xl" class="pa-4">
            <div class="d-flex flex-wrap align-center mb-3">
              <h3 class="text-subtitle-1 font-weight-medium mb-0">
                {{ labelMesAtual }} — {{ periodoAtual }}
              </h3>
              <v-spacer />
              <v-chip variant="flat" color="primary" class="mr-2" prepend-icon="mdi-timer-sand">
                Total:
                {{ formatMinutes(totalOf(daysAtualFiltered)) }}
              </v-chip>
              <v-chip variant="tonal" prepend-icon="mdi-briefcase-check">
                Dias trabalhados:
                {{ workedDaysOf(daysAtualFiltered) }} / {{ daysAtualFiltered.length }}
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
                v-else-if="daysAtualFiltered.length === 0"
                type="info"
                variant="tonal"
                class="mb-3"
                text="Sem dias neste período."
              />

              <v-expansion-panels multiple>
                <v-expansion-panel v-for="d in daysAtualFiltered" :key="d.iso" rounded="lg">
                  <v-expansion-panel-title>
                    <div class="w-100 d-flex align-center">
                      <div class="text-body-1 font-weight-medium">
                        {{ d.weekday }}, {{ d.dateLabel }}
                      </div>

                      <v-spacer />

                      <!-- STATUS -->
                      <v-chip
                        size="small"
                        :color="statusInfo(d.status).color"
                        :variant="statusInfo(d.status).variant"
                        class="mr-2"
                      >
                        <v-icon start>{{ statusInfo(d.status).icon }}</v-icon>
                        {{ statusInfo(d.status).label }}
                      </v-chip>

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

        <!-- ANTERIOR -->
        <v-window-item value="anterior">
          <v-sheet border rounded="xl" class="pa-4">
            <div class="d-flex flex-wrap align-center mb-3">
              <h3 class="text-subtitle-1 font-weight-medium mb-0">
                {{ labelMesAnterior }} — {{ periodoAnterior }}
              </h3>
              <v-spacer />
              <v-chip variant="flat" color="primary" class="mr-2" prepend-icon="mdi-timer-sand">
                Total:
                {{ formatMinutes(totalOf(daysAnteriorFiltered)) }}
              </v-chip>
              <v-chip variant="tonal" prepend-icon="mdi-briefcase-check">
                Dias trabalhados:
                {{ workedDaysOf(daysAnteriorFiltered) }} / {{ daysAnteriorFiltered.length }}
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
                v-else-if="daysAnteriorFiltered.length === 0"
                type="info"
                variant="tonal"
                class="mb-3"
                text="Sem dias neste período."
              />

              <v-expansion-panels multiple>
                <v-expansion-panel v-for="d in daysAnteriorFiltered" :key="d.iso" rounded="lg">
                  <v-expansion-panel-title>
                    <div class="w-100 d-flex align-center">
                      <div class="text-body-1 font-weight-medium">
                        {{ d.weekday }}, {{ d.dateLabel }}
                      </div>

                      <v-spacer />

                      <!-- STATUS -->
                      <v-chip
                        size="small"
                        :color="statusInfo(d.status).color"
                        :variant="statusInfo(d.status).variant"
                        class="mr-2"
                      >
                        <v-icon start>{{ statusInfo(d.status).icon }}</v-icon>
                        {{ statusInfo(d.status).label }}
                      </v-chip>

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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRegistrosStore } from '@/stores/registros'
import { useUserStore } from '@/stores/user'

// === Props ===
const props = defineProps({
  userId: { type: Number, default: 1 },
  apiBase: { type: String, default: 'http://localhost:3000' },
  order: { type: String, default: 'desc', validator: (v) => ['asc', 'desc'].includes(v) },
  /** Quais status contam como "pendentes" no filtro. Por padrão, apenas 'enviado'. */
  pendingStatuses: {
    type: Array,
    default: () => ['enviado'],
  },
})

/* uso */
{/* <HistoricoMensal
  :user-id="userIdDoColaborador"
  :pending-statuses="['enviado']"  <!-- pendências para aprovação -->
  order="desc"
/> */}
{/* <HistoricoMensal
  :user-id="userIdDoColaborador"
  :pending-statuses="['enviado', 'reprovado']"
/> */}

// === Stores ===
const reg = useRegistrosStore()
const userStore = useUserStore()

// Usuário seguro (evita undefined durante a hidratação)
const safeUser = computed(() =>
  userStore.user?.id ? userStore.user : { id: props.userId, name: '' },
)

// API base (em prod o http pode alternar)
const baseUrl = computed(() => {
  if (import.meta.env.MODE === 'production') return ''
  return (import.meta.env.VITE_API_URL || props.apiBase || 'http://localhost:3000').replace(
    /\/$/,
    '',
  )
})

// UI
const tab = ref('atual')
const showOnlyPending = ref(false)
const orderModel = computed({
  get: () => props.order,
  set: (v) => reorder(v),
})

// Datas (congeladas em “today” para relatórios consistentes)
const today = new Date()
const { start: startAtual, end: endAtual } = monthRangeCurrent(today)
const { start: startAnterior, end: endAnterior } = monthRangePrevious(today)

const labelMesAtual = computed(() => monthLabel(startAtual))
const labelMesAnterior = computed(() => monthLabel(startAnterior))
const periodoAtual = computed(() => `${formatShort(startAtual)} – ${formatShort(endAtual)}`)
const periodoAnterior = computed(
  () => `${formatShort(startAnterior)} – ${formatShort(endAnterior)}`,
)

// Estados
const stateAtual = reactive({ days: [], total: 0, daysWorked: 0 })
const stateAnterior = reactive({ days: [], total: 0, daysWorked: 0 })
const loadingAtual = ref(false)
const loadingAnterior = ref(false)
const errorAtual = ref('')
const errorAnterior = ref('')

// ===== Lifecycle =====
onMounted(async () => {
  await userStore.ensureHydratedById(props.userId)
  reg.switchUser(props.userId, baseUrl.value)
  await loadBothMonths()
})

watch(
  () => props.userId,
  async (newId, oldId) => {
    if (newId === oldId) return
    await userStore.ensureHydratedById(newId)
    reg.switchUser(newId, baseUrl.value)
    await loadBothMonths()
  },
)

watch(
  () => props.order,
  () => reorder(props.order),
)

// ===== Status helpers (visual) =====
function statusInfo(status) {
  const s = String(status || 'rascunho')
  switch (s) {
    case 'pronto':
      return {
        label: 'Pronto',
        color: 'secondary',
        variant: 'tonal',
        icon: 'mdi-clipboard-check-outline',
      }
    case 'enviado':
      return { label: 'Enviado', color: 'info', variant: 'tonal', icon: 'mdi-send-clock-outline' }
    case 'aprovado':
      return {
        label: 'Aprovado',
        color: 'success',
        variant: 'flat',
        icon: 'mdi-check-decagram-outline',
      }
    case 'reprovado':
      return {
        label: 'Reprovado',
        color: 'error',
        variant: 'tonal',
        icon: 'mdi-close-circle-outline',
      }
    case 'fechado':
      return { label: 'Fechado', color: 'grey', variant: 'tonal', icon: 'mdi-lock-outline' }
    default:
      return { label: 'Rascunho', color: 'warning', variant: 'tonal', icon: 'mdi-pencil-outline' }
  }
}

const pendingSet = computed(() => new Set(props.pendingStatuses))

// ===== Loaders =====
async function loadBothMonths() {
  resetState(stateAtual)
  resetState(stateAnterior)
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
  } catch (e) {
    console.warn('Erro ao carregar meses', e)
  } finally {
    loadingAtual.value = false
    loadingAnterior.value = false
  }
}

async function buildMonthData(startDate, endDate, order) {
  const mapWithIds = await reg.fetchRange(startDate, endDate).catch((e) => {
    const msg = e?.message || 'Falha ao buscar registros'
    if (toISODate(startDate) === toISODate(startAtual)) errorAtual.value = msg
    else errorAnterior.value = msg
    return {}
  })

  // normaliza para { iso: { pairs, status, ... } }
  const map = {}
  for (const [iso, obj] of Object.entries(mapWithIds)) {
    map[iso] = {
      pairs: obj?.pairs || [],
      status: obj?.status || 'rascunho', // compat com store antigo
    }
  }

  // constrói os dias
  const days = []
  let cursor = new Date(startDate)
  while (cursor <= endDate) {
    const iso = toISODate(cursor)
    const info = map[iso] || { pairs: [], status: 'rascunho' }
    const pares = info.pairs
    const total = pares.reduce((acc, p) => acc + pairMinutes(p), 0)
    days.push({
      iso,
      dateLabel: formatShort(cursor),
      weekday: weekdayLabel(cursor),
      total,
      pairsCount: pares.length,
      pares,
      status: info.status,
    })
    cursor = addDays(cursor, 1)
  }
  if (order === 'desc') days.reverse()

  const total = days.reduce((a, b) => a + b.total, 0)
  const daysWorked = days.filter((d) => d.total > 0).length
  return { days, total, daysWorked }
}

// ===== Filtro + totais dinâmicos =====
const daysAtualFiltered = computed(() =>
  filterDays(stateAtual.days, showOnlyPending.value, pendingSet.value),
)
const daysAnteriorFiltered = computed(() =>
  filterDays(stateAnterior.days, showOnlyPending.value, pendingSet.value),
)

function filterDays(list, onlyPending, set) {
  if (!onlyPending) return list
  return (list || []).filter((d) => set.has(d.status))
}

function totalOf(list) {
  return (list || []).reduce((sum, d) => sum + d.total, 0)
}
function workedDaysOf(list) {
  return (list || []).filter((d) => d.total > 0).length
}

// ===== Ordenação local (sem reconsultar servidor) =====
function reorder(order) {
  reorderState(stateAtual, order)
  reorderState(stateAnterior, order)
}
function reorderState(state, order) {
  if (!Array.isArray(state.days) || state.days.length === 0) return
  state.days = [...state.days].sort((a, b) =>
    order === 'desc' ? (a.iso < b.iso ? 1 : -1) : a.iso > b.iso ? 1 : -1,
  )
}

// ===== Utils locais (datas + pares) =====
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
function resetState(state) {
  state.days = []
  state.total = 0
  state.daysWorked = 0
}
</script>

<style scoped>
.v-expansion-panel-title {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
</style>
