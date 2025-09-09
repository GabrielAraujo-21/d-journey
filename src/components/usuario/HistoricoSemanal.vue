<template>
  <!-- Histórico semanal (últimas N semanas) -->
  <div class="d-flex align-center mt-8 mb-3">
    <h3 class="text-subtitle-1 font-weight-medium mb-0">Histórico semanal</h3>
    <v-spacer />
    <v-select
      v-model="weeksToShowModel"
      :items="[4, 6, 8, 12]"
      label="Semanas"
      class="history-select"
      variant="outlined"
      density="comfortable"
      hide-details
      style="max-width: 140px"
    />
  </div>

  <v-table class="rounded-xl overflow-hidden">
    <thead>
      <tr>
        <th class="text-left">Semana</th>
        <th class="text-left">Total</th>
        <th class="text-left">Dias trabalhados</th>
        <th class="text-left">Média por dia</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="w in weeklyHistory" :key="w.key">
        <td>{{ w.label }}</td>
        <td>{{ formatMinutes(w.total) }}</td>
        <td>{{ w.daysWorked }}</td>
        <td>{{ formatMinutes(w.avgPerDay || 0) }}</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  weeksToShow: { type: Number, required: true },
  weeklyHistory: { type: Array, required: true },
  formatMinutes: { type: Function, required: true },
})
const emit = defineEmits(['update:weeksToShow'])

const weeksToShowModel = computed({
  get: () => props.weeksToShow,
  set: (v) => emit('update:weeksToShow', v),
})
</script>

<style scoped>
.history-select :deep(.v-field) {
  min-width: 120px;
}
</style>
