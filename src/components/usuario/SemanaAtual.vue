<template>
  <!-- Resumo da semana atual -->
  <div class="d-flex align-center mb-3">
    <h3 class="text-subtitle-1 font-weight-medium mb-0">
      Semana atual ({{ weekLabel(currentWeekStart) }})
    </h3>
    <v-spacer />
    <v-chip variant="tonal" class="mr-2">Total: {{ formatMinutes(currentWeek.total) }}</v-chip>
    <v-chip variant="tonal">Média/dia: {{ formatMinutes(currentWeek.avgPerDay || 0) }}</v-chip>
  </div>

  <v-sheet class="pa-4 rounded-xl week-sheet" border>
    <v-row>
      <v-col v-for="(d, i) in currentWeek.days" :key="i" cols="12" sm="6" md="3" lg="3">
        <v-card variant="tonal" rounded="lg" class="pa-3 h-100">
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-caption text-medium-emphasis mb-1">
              {{ d.label }} ({{ d.dateLabel }})
            </div>
            <!-- <v-chip
              class="text-caption text-medium-emphasis mb-1"
              variant="tonal"
              size="small"
              color="primary"
            >
              {{ pairsLength }} {{ pairsLength === 1 ? 'par' : 'pares' }}
            </v-chip> -->
          </div>
          <div class="text-h6 font-weight-bold">{{ formatMinutes(d.total) }}</div>
          <v-progress-linear
            class="mt-2"
            :model-value="Math.min(100, Math.round((d.total / targetDailyMinutes) * 100))"
            height="8"
            rounded
            color="primary"
          />
        </v-card>
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup>
import { useRegistrosStore } from '@/stores/registros'

const props = defineProps({
  currentWeekStart: { type: Object, required: true }, // Date
  currentWeek: { type: Object, required: true },
  targetDailyMinutes: { type: Number, required: true },
  weekLabel: { type: Function, required: true },
  formatMinutes: { type: Function, required: true },
  pairsLength: { type: Number, required: true },
})
</script>

<style scoped>
.week-sheet {
  background: color-mix(in oklab, rgb(var(--v-theme-surface)) 90%, transparent);
}
</style>
