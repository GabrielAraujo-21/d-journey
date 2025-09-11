<!-- src/components/usuario/DJourneyTimeTracker.vue -->
<template>
  <div class="pa-5">
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mx-auto pa-5 tracker-card" elevation="10" rounded="xl">
          <div class="d-flex align-center mb-3">
            <v-avatar size="40" class="mr-3" color="primary" rounded="lg">
              <v-icon>mdi-briefcase-clock</v-icon>
            </v-avatar>
            <div>
              <h2 class="text-h6 font-weight-bold mb-0">
                Jornada de trabalho
                <v-chip class="font-weight-bold" variant="tonal" color="primary">
                  {{ user.name }}
                </v-chip>
              </h2>
              <div class="text-caption text-medium-emphasis text-secondary">
                Registre pares de entrada/saída por dia
              </div>
            </div>
            <v-spacer />
            <v-btn
              variant="text"
              prepend-icon="mdi-delete-sweep-outline"
              class="text-none"
              @click="j.clearAll"
            >
              Limpar tudo
            </v-btn>
          </div>

          <SelecaoDiaria
            v-model:currentDate="j.currentDate"
            :pairs="j.pairs"
            :targetDailyMinutes="j.targetDailyMinutes"
            :dayTotal="j.dayTotal"
            :progressDaily="j.progressDaily"
            :incompleteCount="j.incompleteCount"
            :invalidCount="j.invalidCount"
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
          <HistoricoSemanal v-model:weeksToShow="j.weeksToShow" :weeklyHistory="j.weeklyHistory" />
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
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
const user = computed(() => userStore.user)
const j = useJornadaStore()

onMounted(async () => {
  await userStore.ensureHydratedById(props.userId)
  j.init({ userId: props.userId, apiBase: props.apiBase, target: props.targetDailyMinutes })
  await j.ensureCurrentDayLoaded()
  await j.preloadWeeksRange()
})

watch(
  () => props.userId,
  async (newId, oldId) => {
    if (newId === oldId) return
    await userStore.ensureHydratedById(newId)
    await j.switchUser(newId, props.apiBase) // limpa cache + recarrega ranges
  },
)
</script>
