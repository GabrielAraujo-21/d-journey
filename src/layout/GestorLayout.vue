<template>
  <v-layout>
    <v-app-bar flat class="elevated fixed-app-bar" :extension-height="inMinhaArea ? 48 : 0">
      <v-app-bar-title class="d-flex align-center">
        <v-avatar size="32" class="mr-2" color="primary" rounded="lg">
          <v-icon>mdi-account-tie</v-icon>
        </v-avatar>
        <span class="text-subtitle-1 font-weight-medium">Painel do Gestor</span>
        <span v-if="selectedName" class="text-subtitle-2 font-weight-light ml-3">
          - {{ selectedName }}</span
        >
      </v-app-bar-title>

      <v-spacer />

      <!-- Abas de topo -->
      <v-tabs density="comfortable" align-tabs="end">
        <v-tab :to="{ name: 'djourney-gestor', params: { id: route.params.id } }" :exact="true">
          <v-icon start>mdi-account-group</v-icon>Equipe
        </v-tab>

        <v-tab :to="{ name: 'gestor-minha-diario', params: { id: route.params.id } }">
          <v-icon start>mdi-account-circle</v-icon>Minha jornada
        </v-tab>

        <v-tab :to="{ name: 'logout' }"> <v-icon start>mdi-logout</v-icon>Sair </v-tab>
      </v-tabs>

      <!-- Sub-abas só quando estamos em “Minha jornada” -->
      <template #extension>
        <div v-if="inMinhaArea" class="px-4 w-100">
          <v-tabs density="comfortable" align-tabs="start">
            <v-tab
              :to="{ name: 'gestor-minha-diario', params: { id: route.params.id } }"
              :exact="true"
            >
              <v-icon start>mdi-calendar-check</v-icon>Diário
            </v-tab>
            <v-tab :to="{ name: 'gestor-minha-mensal', params: { id: route.params.id } }">
              <v-icon start>mdi-calendar-month</v-icon>Mensal
            </v-tab>
          </v-tabs>
        </div>
      </template>
    </v-app-bar>

    <v-main>
      <!-- Breadcrumbs -->
      <v-container fluid class="pt-4 pb-0">
        <v-breadcrumbs :items="breadcrumbs" class="mb-2">
          <template #divider>
            <v-icon size="16">mdi-chevron-right</v-icon>
          </template>
        </v-breadcrumbs>
      </v-container>

      <v-container fluid class="py-4">
        <v-row>
          <!-- Coluna da Equipe (apenas na área “Equipe”) -->
          <v-col v-if="isEquipeArea" cols="12" md="4" lg="3">
            <v-card rounded="xl" class="tracker-card pa-4" elevation="10">
              <div class="d-flex align-center mb-3">
                <h2 class="text-subtitle-1 font-weight-bold mb-0">Sua equipe</h2>
                <v-spacer />
                <v-btn icon variant="text" :loading="user.loading" @click="reload()">
                  <v-icon>mdi-refresh</v-icon>
                  <v-tooltip activator="parent" text="Recarregar equipe" />
                </v-btn>
              </div>

              <v-text-field
                v-model="query"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-magnify"
                label="Buscar por nome ou e-mail"
                hide-details
                class="mb-3"
                clearable
              />

              <v-alert
                v-if="user.error"
                type="error"
                variant="tonal"
                class="mb-3"
                :text="user.error"
              />

              <v-skeleton-loader
                v-if="user.loading && !user.team?.length"
                type="list-item-two-line, list-item-two-line, list-item-two-line"
                class="mb-2"
              />

              <v-list lines="two" class="soft-card">
                <v-list-item
                  v-for="m in filteredTeam"
                  :key="m.id"
                  :title="m.name || m.nome || m.fullName || m.email || `ID ${m.id}`"
                  :subtitle="m.email"
                  class="fade-in"
                  @click="openMember(m)"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-avatar size="36" color="secondary" rounded="lg">
                      <v-icon>mdi-account</v-icon>
                    </v-avatar>
                  </template>
                  <template #append>
                    <v-btn
                      icon
                      variant="text"
                      :aria-label="`Abrir jornada de ${m.name || m.email}`"
                    >
                      <v-icon>mdi-chevron-right</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>

                <v-list-item v-if="!user.loading && filteredTeam.length === 0">
                  <v-list-item-title class="text-medium-emphasis">
                    Nenhum colaborador encontrado.
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>

          <!-- Área de conteúdo -->
          <v-col :cols="12" :md="isEquipeArea ? 8 : 12" :lg="isEquipeArea ? 9 : 12">
            <router-view />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useBreadcrumbs, defaultGestorBreadcrumbs } from '@/composables/breadcrumbs'

const user = useUserStore()
const route = useRoute()
const router = useRouter()

const query = ref('')
const titulo = ref('')

// tenta meta.selectedUser (setado pela guard da rota) e cai pro userStore (hidratado pelo tracker)
const selectedName = computed(() => route.meta?.selectedUser?.name)

// estamos na área “Equipe” (lista de membros) ou “Minha jornada” (diário/mensal do próprio gestor)?
const isEquipeArea = computed(
  () => route.name === 'djourney-gestor' || route.name === 'djourney-gestor-usuario',
)
const inMinhaArea = computed(() => String(route.name || '').startsWith('gestor-minha-'))

// breadcrumbs por composable (usa meta.breadcrumb; senão, fallback do Gestor)
const { breadcrumbs } = useBreadcrumbs(defaultGestorBreadcrumbs)

const filteredTeam = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return user.team || []
  return (user.team || []).filter((m) => {
    const name = (m.name || m.nome || m.fullName || '').toLowerCase()
    const email = String(m.email || '').toLowerCase()
    return name.includes(q) || email.includes(q)
  })
})

async function reload() {
  const managerId = Number(route.params.id)
  await user.reloadTeam(managerId)
}

function openMember(m) {
  titulo.value = `Jornada de ${m.name || m.email}`
  router.push({
    name: 'djourney-gestor-usuario',
    params: { id: route.params.id, userId: m.id },
  })
}

onMounted(async () => {
  await user.ensureHydratedById(Number(route.params.id))
  await reload()
})

watch(
  () => route.params.id,
  async () => {
    await user.ensureHydratedById(Number(route.params.id))
    await reload()
  },
)
</script>
