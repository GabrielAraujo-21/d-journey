<!-- src/components/usuario/SemanaAtual.vue -->
<template>
  <div class="d-flex align-center mb-3">
    <h2 class="text-h6 font-weight-bold mb-0">Semana atual ({{ label }})</h2>
    <v-spacer />
    <v-chip variant="tonal" class="mr-2" color="primary"
      >Total: {{ fmt(currentWeek.total) }}</v-chip
    >
    <v-chip variant="tonal" color="primary"
      >Média/dia: {{ fmt(currentWeek.avgPerDay || 0) }}</v-chip
    >
  </div>

  <v-sheet class="pa-4 rounded-xl week-sheet" border>
    <v-row>
      <v-col v-for="(d, i) in currentWeek.days" :key="i" cols="12" sm="6" md="3" lg="3">
        <v-card variant="tonal" rounded="lg" class="pa-3 h-100">
          <div class="text-caption text-medium-emphasis mb-1">
            {{ d.label }} ({{ d.dateLabel }})
          </div>
          <div class="text-h6 font-weight-bold">{{ fmt(d.total) }}</div>
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
import { computed } from 'vue'
import { weekLabel, formatMinutes as fmt } from '@/plugins/dates'

const props = defineProps({
  currentWeekStart: { type: [String, Object], required: true }, // ISO ou Date
  currentWeek: { type: Object, required: true },
  targetDailyMinutes: { type: Number, required: true },
})

const toDate = (v) => (v instanceof Date ? v : new Date(v))
const label = computed(() => weekLabel(toDate(props.currentWeekStart)))

// onMounted(() => {
//   console.log('currentWeekStart', props.currentWeekStart)
//   console.log('currentWeek', props.currentWeek)
//   console.log('targetDailyMinutes', props.targetDailyMinutes)
// })
</script>

<style scoped>
.week-sheet {
  background: color-mix(in oklab, rgb(var(--v-theme-surface)) 90%, transparent);
}
</style>
