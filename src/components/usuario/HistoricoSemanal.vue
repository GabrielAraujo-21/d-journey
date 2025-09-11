<!-- src/components/usuario/HistoricoSemanal.vue -->
<template>
  <div class="d-flex align-center mb-3">
    <h2 class="text-h6 font-weight-bold mb-0">Histórico semanal</h2>
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
        <td>{{ fmt(w.total) }}</td>
        <td>{{ w.daysWorked }}</td>
        <td>{{ fmt(w.avgPerDay || 0) }}</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { computed } from 'vue'
import { formatMinutes as fmt } from '@/plugins/dates'

const props = defineProps({
  weeksToShow: { type: Number, required: true },
  weeklyHistory: { type: Array, required: true },
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
