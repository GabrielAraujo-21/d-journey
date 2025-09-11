<template>
  <v-app id="inspire">
    <!-- App Bar -->
    <v-app-bar flat>
      <v-container class="mx-auto d-flex align-center justify-center">
        <img
          class="logo-lg mx-auto mb-3"
          :src="logoUrl"
          alt="d-journey"
          width="44"
          height="44"
          decoding="async"
          loading="eager"
          fetchpriority="high"
        />

        <v-list-item
          :prepend-avatar="managerAvatar"
          :subtitle="managerEmail"
          :title="managerName"
          rounded="lg"
          density="comfortable"
          class="pb-3"
        >
        </v-list-item>
        <!-- usar o conteúdo do botão em vez de :text -->
        <v-btn v-for="link in links" :key="link" variant="text">{{ link }}</v-btn>

        <v-spacer></v-spacer>

        <v-responsive max-width="220">
          <v-text-field
            v-model="search"
            density="compact"
            label="Pesquisar"
            rounded="lg"
            variant="solo-filled"
            flat
            hide-details
            single-line
            clearable
            prepend-inner-icon="mdi-magnify"
          />
        </v-responsive>

        <v-divider class="mx-3 align-self-center" length="24" thickness="2" vertical />

        <v-btn icon="mdi-logout" @click="$router.push({ name: 'logout' })" />
      </v-container>
    </v-app-bar>

    <!-- Main -->
    <v-main>
      <v-card class="mx-7 my-7 pa-4">
        <v-row>
          <!-- Lateral esquerda: equipe do gestor -->
          <v-col cols="12" md="3" lg="3">
            <v-sheet rounded="lg">
              <v-list rounded="lg" class="tracker-card" lines="two">
                <v-list-subheader class="text-medium-emphasis">Minha equipe</v-list-subheader>

                <v-divider class="my-2" />
                <template v-if="loading">
                  <v-skeleton-loader
                    type="list-item-two-line, list-item-two-line, list-item-two-line"
                    class="px-3 pb-2"
                  />
                </template>

                <template v-else>
                  <v-alert
                    v-if="error"
                    type="error"
                    variant="tonal"
                    class="mx-3 my-2"
                    :text="error"
                  />
                  <v-alert
                    v-else-if="filteredUsers.length === 0"
                    type="info"
                    variant="tonal"
                    class="mx-3 my-2"
                    text="Nenhum usuário encontrado."
                  />

                  <v-list-item
                    v-for="u in filteredUsers"
                    :key="u.id ?? u.email ?? u.name"
                    :prepend-avatar="userAvatar(u)"
                    :title="u.name"
                    :subtitle="u.email"
                    rounded="lg"
                    density="comfortable"
                    :to="{
                      // [FIX] Navegação correta por nome de rota filho, preservando o :id do gestor
                      name: 'djourney-gestor-usuario',
                      params: { id: $route.params.id, userId: u.id },
                    }"
                    :exact="true"
                    active-class="router-link-exact-active"
                    link
                  >
                    <template #append>
                      <v-badge v-show="u.onLine" color="green" dot overlap class="mb-2 ml-5" />
                      <v-badge v-show="!u.onLine" color="red" dot overlap class="mb-2 ml-5" />
                    </template>
                  </v-list-item>

                  <v-divider class="my-2" />

                  <v-list-item
                    color="grey-lighten-4"
                    title="Atualizar lista"
                    prepend-icon="mdi-refresh"
                    link
                    @click="reloadTeam()"
                  />
                </template>
              </v-list>
            </v-sheet>
          </v-col>

          <!-- Conteúdo principal -->
          <v-col cols="12" md="9" lg="9">
            <v-sheet min-height="70vh" rounded="lg">
              <RouterView :key="`sel-${$route.params.userId || 'none'}`" />
            </v-sheet>
          </v-col>
        </v-row>
      </v-card>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from 'vuetify'

const links = ['Dashboard', 'Minhas Marcações', 'Aprovações', 'Relatórios']

const theme = useTheme()
const userStore = useUserStore()
const auth = useAuthStore()

const DEFAULT_AVATAR = '/sem-imagem.png'
const search = ref('')
const logoUrl = '/d-journey-logo-mark.svg'

function reloadTeam() {
  // separação: equipe do gestor logado (conta), não do userStore (selecionado)
  return userStore.reloadTeam(auth.accountId)
}

/* Header do gestor (conta logada) */
const managerName = computed(() => auth.account?.name || 'Gestor')
const managerEmail = computed(() => auth.account?.email || 'email@empresa.com')
const managerAvatar = computed(() =>
  auth.account?.avatarUrl ? `/${auth.account.avatarUrl}` : DEFAULT_AVATAR,
)

/* Lista/estado */
const team = computed(() => (Array.isArray(userStore.team) ? userStore.team : []))
const loading = computed(() => userStore.loading)
const error = computed(() => userStore.error)

function userAvatar(u) {
  return u?.avatarUrl ? `/${u.avatarUrl}` : DEFAULT_AVATAR
}

const filteredUsers = computed(() => {
  const base = team.value
  if (!Array.isArray(base) || base.length === 0) return []
  const q = (search.value || '').toLowerCase().trim()
  if (!q) return base
  return base.filter(
    (u) =>
      String(u.name || '')
        .toLowerCase()
        .includes(q) ||
      String(u.email || '')
        .toLowerCase()
        .includes(q),
  )
})

onMounted(async () => {
  theme.change(auth.account?.themeColor || 'light')
  await reloadTeam()
})
</script>
