<!-- src/components/usuario/SelecaoDiaria.vue -->
<template>
  <!-- Seleção do dia -->
  <v-row class="mb-4" align="center">
    <v-col cols="12" md="4">
      <v-text-field
        v-model="currentDateModel"
        label="Dia"
        type="date"
        variant="outlined"
        density="comfortable"
        hide-details
      />
    </v-col>

    <v-col cols="12" md="3" class="d-flex align-end justify-end">
      <v-btn
        color="primary"
        class="text-none"
        :disabled="disabled"
        @click="$emit('add-pair')"
      >
        <template #prepend>
          <v-icon>mdi-plus</v-icon>
        </template>
        <template #default><span class="text-body-2">Adicionar par</span></template>
      </v-btn>
    </v-col>

    <v-col cols="12" md="3" class="d-flex align-end justify-end">
      <v-btn
        variant="tonal"
        class="text-none"
        :disabled="disabled || pairs.length === 0"
        @click="$emit('sort-pairs')"
      >
        <template #prepend>
          <v-icon>mdi-sort-clock-ascending-outline</v-icon>
        </template>
        <template #default><span class="text-body-2">Ordenar início</span></template>
      </v-btn>
    </v-col>

    <v-col cols="12" md="2" class="d-flex align-end justify-end">
      <v-btn
        variant="text"
        class="text-none"
        :disabled="disabled || pairs.length === 0"
        @click="$emit('clear-day')"
      >
        <template #prepend>
          <v-icon>mdi-broom</v-icon>
        </template>
        <template #default>
          <span class="text-body-2" style="font-size: 0.875rem">Limpar dia</span>
        </template>
      </v-btn>
    </v-col>
  </v-row>

  <!-- Pares do dia -->
  <v-sheet class="pa-4 rounded-xl day-sheet" border>
    <div class="d-flex align-center mb-3">
      <h3 class="text-subtitle-1 font-weight-medium mb-0">Pares (entrada → saída)</h3>
      <v-spacer />
      <v-chip size="small" variant="tonal">
        {{ pairs.length }} {{ pairs.length === 1 ? 'par' : 'pares' }}
      </v-chip>
    </div>

    <v-row v-if="pairs.length === 0" class="text-medium-emphasis">
      <v-col cols="12" class="text-center py-8">
        <v-icon size="40" class="mb-2">mdi-timeline-clock-outline</v-icon>
        <div>Nenhum par registrado neste dia.</div>
      </v-col>
    </v-row>

    <v-row v-for="(p, idx) in pairs" :key="idx" class="d-flex align-baseline pair-row">
      <v-col cols="12" sm="4">
        <v-text-field
          v-model="p.in"
          label="Entrada"
          type="time"
          step="60"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-login-variant"
          hide-details="auto"
          clearable
          :disabled="disabled"
          @blur="$emit('persist')"
        >
          <template #append-inner>
            <v-tooltip text="Preencher com hora atual" activator="parent" />
            <v-btn
              icon
              variant="text"
              :disabled="disabled"
              @click="p.in = nowHM()"
              :aria-label="`Entrada agora (par ${idx + 1})`"
            >
              <v-icon>mdi-clock-check-outline</v-icon>
            </v-btn>
          </template>
        </v-text-field>
      </v-col>

      <v-col cols="12" sm="4">
        <v-text-field
          v-model="p.out"
          label="Saída"
          type="time"
          step="60"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-logout-variant"
          :error="isInvalid(idx)"
          :error-messages="invalidMessage(idx)"
          hide-details="auto"
          clearable
          :disabled="disabled"
          @blur="$emit('persist')"
        >
          <template #append-inner>
            <v-tooltip text="Preencher com hora atual" activator="parent" />
            <v-btn
              icon
              variant="text"
              :disabled="disabled"
              @click="p.out = nowHM()"
              :aria-label="`Saída agora (par ${idx + 1})`"
            >
              <v-icon>mdi-clock-check-outline</v-icon>
            </v-btn>
          </template>
        </v-text-field>
      </v-col>

      <v-col cols="12" sm="4" class="d-flex align-center justify-end gap-2">
        <v-chip v-if="pairMinutes(p) > 0" size="small" color="primary" variant="tonal">
          <span>{{ formatMinutes(pairMinutes(p)) }}</span>
          <v-tooltip
            v-if="isCrossMidnight(p)"
            text="Par cruza a meia-noite (conta para o total do dia escolhido)"
            activator="parent"
          />
          <v-icon v-if="isCrossMidnight(p)" start class="ml-2">mdi-weather-night</v-icon>
        </v-chip>

        <v-btn
          icon
          variant="text"
          :disabled="disabled"
          @click="$emit('duplicate-pair', idx)"
          :aria-label="`Duplicar par ${idx + 1}`"
        >
          <v-tooltip text="Duplicar par" activator="parent" />
          <v-icon>mdi-content-duplicate</v-icon>
        </v-btn>
        <v-btn
          icon
          variant="text"
          color="error"
          :disabled="disabled"
          @click="$emit('remove-pair', idx)"
          :aria-label="`Remover par ${idx + 1}`"
        >
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>
      </v-col>

      <v-col cols="12"><v-divider class="my-2" /></v-col>
    </v-row>

    <!-- Totais do dia -->
    <div class="d-flex flex-wrap align-center justify-space-between mt-2">
      <div class="d-flex align-center gap-2">
        <v-chip variant="flat" color="primary" size="large" class="font-weight-medium mr-3">
          Total do dia: {{ formatMinutes(dayTotalLocal) }}
        </v-chip>
        <v-chip
          v-if="incompleteCountLocal > 0"
          variant="tonal"
          color="warning"
          size="small"
          class="mr-3"
        >
          {{ incompleteCountLocal }}
          {{ incompleteCountLocal === 1 ? 'par incompleto' : 'pares incompletos' }}
        </v-chip>
        <v-chip
          v-if="invalidCountLocal > 0"
          variant="tonal"
          color="error"
          size="small"
          class="mr-3"
        >
          {{ invalidCountLocal }} {{ invalidCountLocal === 1 ? 'par inválido' : 'pares inválidos' }}
        </v-chip>
      </div>

      <div class="w-100 mt-3" v-if="targetDailyMinutes > 0">
        <v-progress-linear
          rounded
          height="12"
          :model-value="progressDailyLocal"
          :striped="dayTotalLocal < targetDailyMinutes"
          color="primary"
        />
        <div class="text-caption text-medium-emphasis mt-1">
          Meta diária: {{ formatMinutes(targetDailyMinutes) }} • Progresso:
          {{ Math.min(100, Math.round(progressDailyLocal)) }}%
        </div>
      </div>
    </div>
  </v-sheet>
</template>

<script setup>
import { computed } from 'vue'
import { nowHM, toMinutes, pairMinutes, isCrossMidnight, formatMinutes } from '@/plugins/dates'

const props = defineProps({
  currentDate: { type: String, required: true },
  pairs: { type: Array, required: true },
  targetDailyMinutes: { type: Number, required: true },
  // NOVO: bloqueio dos inputs do dia
  disabled: { type: Boolean, default: false },

  // (opcionais) vindos do pai/store
  dayTotal: { type: Number, default: null },
  progressDaily: { type: Number, default: null },
  incompleteCount: { type: Number, default: null },
  invalidCount: { type: Number, default: null },
})

const emit = defineEmits([
  'update:currentDate',
  'add-pair',
  'sort-pairs',
  'clear-day',
  'duplicate-pair',
  'remove-pair',
  'persist',
])

const currentDateModel = computed({
  get: () => props.currentDate,
  set: (v) => emit('update:currentDate', v),
})

// Derivados locais
const dayTotalLocal = computed(
  () => props.dayTotal ?? props.pairs.reduce((a, p) => a + pairMinutes(p), 0),
)
const progressDailyLocal = computed(
  () =>
    props.progressDaily ??
    (props.targetDailyMinutes > 0 ? (dayTotalLocal.value / props.targetDailyMinutes) * 100 : 0),
)
const incompleteCountLocal = computed(
  () => props.incompleteCount ?? props.pairs.filter((p) => !(p.in && p.out)).length,
)
const invalidCountLocal = computed(
  () =>
    props.invalidCount ??
    props.pairs.filter((p) => {
      if (!(p.in && p.out)) return false
      const a = toMinutes(p.in)
      const b = toMinutes(p.out)
      if (Number.isNaN(a) || Number.isNaN(b)) return true
      const diff = (b - a + 24 * 60) % (24 * 60)
      return diff === 0 || diff > 16 * 60
    }).length,
)

function isInvalid(index) {
  const p = props.pairs[index]
  if (!(p?.in && p?.out)) return false
  const a = toMinutes(p.in)
  const b = toMinutes(p.out)
  if (Number.isNaN(a) || Number.isNaN(b)) return true
  const diff = (b - a + 24 * 60) % (24 * 60)
  return diff === 0 || diff > 16 * 60
}
function invalidMessage(index) {
  return isInvalid(index) ? 'Par inválido (verifique os horários)' : ''
}
</script>

<style scoped>
.day-sheet {
  background: color-mix(in oklab, rgb(var(--v-theme-surface)) 90%, transparent);
}
.pair-row + .pair-row {
  margin-top: 0.25rem;
}
</style>
