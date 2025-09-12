<!-- src/components/usuario/DJourneyTimeTracker.vue -->
<template>
  <div>
    <!-- Placeholder quando gestor ainda não selecionou um usuário -->
    <template v-if="!hasUser">
      <v-row>
        <v-col cols="12" md="6">
          <v-card class="mx-auto pa-5 tracker-card" elevation="10" rounded="xl">
            <div class="d-flex align-center mb-2">
              <v-avatar size="40" class="mr-3" color="primary" rounded="lg">
                <v-icon>mdi-account-search</v-icon>
              </v-avatar>
              <div>
                <h2 class="text-h6 font-weight-bold mb-0">Selecione um colaborador</h2>
                <div class="text-caption text-medium-emphasis text-secondary">
                  Escolha um usuário na lista para visualizar a jornada diária.
                </div>
              </div>
            </div>
            <v-skeleton-loader type="list-item-two-line, table" />
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-skeleton-loader type="image, article, table" class="tracker-card pa-5" />
        </v-col>
      </v-row>
    </template>

    <!-- Jornada normal quando há usuário -->
    <template v-else>
      <v-row>
        <v-col cols="12" md="6">
          <v-card class="mx-auto pa-5 tracker-card" elevation="10" rounded="xl">
            <!-- ===== NOVO: header com status + CTAs ===== -->
            <div class="d-flex align-center mb-3">
              <v-avatar size="40" class="mr-3" color="primary" rounded="lg">
                <v-icon>mdi-briefcase-clock</v-icon>
              </v-avatar>
              <div class="mr-3">
                <h2 class="text-h6 font-weight-bold mb-0">Jornada de trabalho</h2>
                <div class="text-caption text-medium-emphasis text-secondary">
                  Registre pares de entrada/saída por dia
                </div>
              </div>

              <!-- Chip de status -->
              <v-chip :color="statusColor(j.currentStatus)" variant="flat" class="ml-2">
                {{ statusLabel(j.currentStatus) }}
              </v-chip>

              <v-spacer />

              <!-- Ações do Usuário -->
              <template v-if="j.isUser">
                <v-btn
                  v-if="j.canSubmit"
                  color="primary"
                  class="text-none mr-2"
                  variant="flat"
                  prepend-icon="mdi-send-check"
                  @click="j.submitToday()"
                >
                  Enviar p/ aprovação
                </v-btn>

                <v-btn
                  v-if="j.canRetract"
                  class="text-none mr-2"
                  variant="tonal"
                  prepend-icon="mdi-undo-variant"
                  @click="j.retractToday()"
                >
                  Retirar envio
                </v-btn>

                <v-btn
                  v-if="j.currentStatus === 'rascunho' || j.currentStatus === 'reprovado'"
                  class="text-none mr-2"
                  variant="text"
                  prepend-icon="mdi-check-decagram-outline"
                  @click="j.markReadyToday()"
                >
                  Conferi
                </v-btn>
              </template>

              <!-- Ações do Gestor -->
              <template v-if="j.isManager">
                <v-btn
                  v-if="j.canApprove"
                  color="primary"
                  class="text-none mr-2"
                  variant="flat"
                  prepend-icon="mdi-check"
                  @click="j.approveToday()"
                >
                  Aprovar
                </v-btn>

                <v-btn
                  v-if="j.canReject"
                  color="error"
                  class="text-none mr-2"
                  variant="flat"
                  prepend-icon="mdi-close"
                  @click="openReject()"
                >
                  Reprovar
                </v-btn>

                <v-btn
                  v-if="j.canReopen"
                  class="text-none mr-2"
                  variant="tonal"
                  prepend-icon="mdi-lock-open-variant"
                  @click="j.reopenToday('Correção solicitada pelo gestor')"
                >
                  Reabrir
                </v-btn>

                <v-btn
                  v-if="j.canClose"
                  class="text-none"
                  variant="tonal"
                  prepend-icon="mdi-lock-check-outline"
                  @click="j.closeToday()"
                >
                  Fechar
                </v-btn>
              </template>
            </div>

            <!-- resto do card (igual) -->
            <SelecaoDiaria
              v-model:currentDate="j.currentDate"
              :pairs="j.pairs"
              :targetDailyMinutes="j.targetDailyMinutes"
              :dayTotal="j.dayTotal"
              :progressDaily="j.progressDaily"
              :incompleteCount="j.incompleteCount"
              :invalidCount="j.invalidCount"
              :disabled="!j.canEdit"
              @add-pair="j.addPair"
              @sort-pairs="j.sortPairs"
              @clear-day="j.clearDay"
              @duplicate-pair="j.duplicatePair"
              @remove-pair="j.removePair"
              @persist="j.persist"
            />
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="mx-auto mb-5 pa-5 tracker-card" elevation="10" rounded="xl">
            <SemanaAtual
              :currentWeekStart="j.currentWeekStart"
              :currentWeek="j.currentWeek"
              :targetDailyMinutes="j.targetDailyMinutes"
            />
          </v-card>
          <v-card class="mx-auto pa-5 tracker-card" elevation="10" rounded="xl">
            <HistoricoSemanal
              v-model:weeksToShow="j.weeksToShow"
              :weeklyHistory="j.weeklyHistory"
            />
          </v-card>
        </v-col>
      </v-row>

      <!-- ===== NOVO: Dialog de reprovação ===== -->
      <v-dialog v-model="reject.open" max-width="520">
        <v-card rounded="xl">
          <v-card-title class="text-subtitle-1 font-weight-bold"> Reprovar dia </v-card-title>
          <v-card-text>
            <v-textarea
              v-model="reject.note"
              label="Justificativa ao colaborador"
              variant="outlined"
              rows="4"
              auto-grow
            />
          </v-card-text>
          <v-card-actions class="px-6 pb-4">
            <v-spacer />
            <v-btn variant="text" @click="reject.open = false">Cancelar</v-btn>
            <v-btn color="error" variant="flat" @click="confirmReject">Reprovar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>

<script setup>
import { reactive, onMounted, watch, computed } from 'vue'
import HistoricoSemanal from '@/components/usuario/HistoricoSemanal.vue'
import SelecaoDiaria from '@/components/usuario/SelecaoDiaria.vue'
import SemanaAtual from '@/components/usuario/SemanaAtual.vue'
import { useUserStore } from '@/stores/user'
import { useJornadaStore } from '@/stores/jornada'

const props = defineProps({
  userId: { type: Number, default: null },
  apiBase: { type: String, default: 'http://localhost:3000' },
  targetDailyMinutes: { type: Number, default: 480 },
})

const userStore = useUserStore()
const j = useJornadaStore()
const hasUser = computed(() => Number.isFinite(props.userId) && props.userId > 0)

const reject = reactive({ open: false, note: '' })
function openReject() {
  reject.open = true
  reject.note = ''
}
async function confirmReject() {
  await j.rejectToday(reject.note)
  reject.open = false
}

// helpers visuais
function statusLabel(s) {
  return (
    {
      rascunho: 'Rascunho',
      pronto: 'Pronto',
      enviado: 'Enviado',
      aprovado: 'Aprovado',
      reprovado: 'Reprovado',
      fechado: 'Fechado',
    }[s] || 'Rascunho'
  )
}
function statusColor(s) {
  return (
    {
      rascunho: 'grey',
      pronto: 'secondary',
      enviado: 'warning',
      aprovado: 'success',
      reprovado: 'error',
      fechado: 'info',
    }[s] || 'grey'
  )
}

onMounted(async () => {
  // SEMPRE inicializa — se userId=null, o j.init() zera cache do registros
  j.init({ userId: props.userId, apiBase: props.apiBase, target: props.targetDailyMinutes })

  if (hasUser.value) {
    await userStore.ensureHydratedById(props.userId)
    await j.ensureCurrentDayLoaded()
    await j.preloadWeeksRange()
  }
  // if (!props.userId) return
  // await userStore.ensureHydratedById(props.userId)
  // j.init({ userId: props.userId, apiBase: props.apiBase, target: props.targetDailyMinutes })
  // await j.ensureCurrentDayLoaded()
  // await j.preloadWeeksRange()
})

watch(
  () => props.userId,
  async (newId, oldId) => {
    // Troca para "sem seleção"
    if (!Number.isFinite(newId) || newId <= 0) {
      j.init({ userId: null, apiBase: props.apiBase, target: props.targetDailyMinutes }) // limpa cache e congela IO
      return
    }
    // Selecionou alguém
    if (newId !== oldId) {
      await userStore.ensureHydratedById(newId)
      await j.switchUser(newId, props.apiBase) // limpa cache + recarrega ranges
    }
  },
)
// watch(
//   () => props.userId,
//   async (newId, oldId) => {
//     if (!props.userId) return
//     if (newId === oldId) return
//     await userStore.ensureHydratedById(newId)
//     await j.switchUser(newId, props.apiBase)
//   },
// )
</script>
