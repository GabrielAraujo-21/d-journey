<template>
  <v-app id="inspire">
    <!-- App Bar -->
    <v-app-bar flat>
      <v-container class="mx-auto d-flex align-center justify-center">
        <v-list-item
          :prepend-avatar="managerAvatar"
          :subtitle="managerEmail"
          :title="managerName"
        ></v-list-item>

        <v-btn v-for="link in links" :key="link" :text="link" variant="text"></v-btn>

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
    <v-main class="bg-grey-lighten-3">
      <v-container>
        <v-row>
          <!-- Lateral esquerda: equipe do gestor -->
          <v-col cols="12" md="3" lg="3">
            <v-sheet rounded="lg">
              <v-list rounded="lg">
                <v-list-subheader class="text-medium-emphasis">Minha equipe</v-list-subheader>

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
                    :key="u.id"
                    :prepend-avatar="userAvatar(u)"
                    :title="u.name"
                    :subtitle="u.email"
                    rounded="lg"
                    density="comfortable"
                  >
                    <!-- Se quiser navegar para o detalhe do usuário, descomente a linha abaixo -->
                    <!-- <template #append>
                      <v-btn icon="mdi-open-in-new" variant="text" :to="{ name: 'usuario', params: { id: u.id } }" />
                    </template> -->
                  </v-list-item>

                  <v-divider class="my-2" />

                  <v-list-item
                    color="grey-lighten-4"
                    title="Atualizar lista"
                    prepend-icon="mdi-refresh"
                    link
                    @click="reloadTeam"
                  />
                </template>
              </v-list>
            </v-sheet>
          </v-col>

          <!-- Conteúdo principal -->
          <v-col cols="12" md="9" lg="9">
            <v-sheet min-height="70vh" rounded="lg">
              <router-view />
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useTheme } from 'vuetify'
import { http } from '@/services/api' // ⟵ usa dev/prod automaticamente

const theme = useTheme()
const userStore = useUserStore()
const route = useRoute()

const DEFAULT_AVATAR = '/sem-imagem.png'

const loading = ref(false)
const error = ref('')
const search = ref('')

const team = ref([]) // usuários subordinados ao gestor (managerId = gestor.id)

/* Helpers de API via http (sem fetch direto) */
async function fetchUserById(id) {
  return await http.get(`/users/${id}`)
}
async function fetchTeamByManager(managerId) {
  return await http.get('/users', {
    search: { managerId, _sort: 'name', _order: 'asc' },
  })
}

/* Garantir que o gestor está carregado no store (após refresh, por exemplo) */
async function ensureManagerLoaded() {
  const paramId = Number(route.params.id)
  if (!userStore.isLoggedIn || userStore.id !== paramId) {
    const u = await fetchUserById(paramId)
    userStore.setUser(u)
  }
}

/* Carregar equipe */
async function reloadTeam() {
  loading.value = true
  error.value = ''
  try {
    await ensureManagerLoaded()
    const managerId = userStore.id
    const arr = await fetchTeamByManager(managerId)
    team.value = Array.isArray(arr) ? arr : []
    theme.change(userStore.themeColor)
  } catch (e) {
    error.value = e?.message || 'Não foi possível carregar a equipe.'
  } finally {
    loading.value = false
  }
}

/* Computeds para header do gestor */
const managerName = computed(() => userStore.name || 'Gestor')
const managerEmail = computed(() => userStore.email || 'email@empresa.com')
const managerAvatar = computed(() =>
  userStore.avatarUrl ? `/${userStore.avatarUrl}` : DEFAULT_AVATAR,
)

/* Avatar do usuário da lista */
function userAvatar(u) {
  return u?.avatarUrl ? `/${u.avatarUrl}` : DEFAULT_AVATAR
}

/* Filtro local por nome/e-mail */
const filteredUsers = computed(() => {
  const q = (search.value || '').toLowerCase().trim()
  if (!q) return team.value
  return team.value.filter((u) => {
    const name = String(u.name || '').toLowerCase()
    const email = String(u.email || '').toLowerCase()
    return name.includes(q) || email.includes(q)
  })
})

onMounted(reloadTeam)
watch(
  () => route.params.id,
  async () => {
    await reloadTeam()
  },
)

const links = ['Dashboard', 'Messages', 'Profile', 'Updates']
</script>

<!-- <script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useTheme } from 'vuetify'
const theme = useTheme()

const userStore = useUserStore()
const route = useRoute()

/* Config */
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const DEFAULT_AVATAR = '/sem-imagem.png'

/* Estado */
const loading = ref(false)
const error = ref('')
const search = ref('')

const team = ref([]) // usuários subordinados ao gestor (managerId = gestor.id)

/* Helpers de API */
async function fetchUserById(id) {
  const res = await fetch(`${API_BASE}/users/${id}`)
  if (!res.ok) throw new Error(`Usuário ${id} não encontrado`)
  return await res.json()
}

async function fetchTeamByManager(managerId) {
  const url = `${API_BASE}/users?managerId=${encodeURIComponent(managerId)}&_sort=name&_order=asc`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao carregar equipe do gestor #${managerId}`)
  return await res.json()
}

/* Garantir que o gestor está carregado no store (após refresh, por exemplo) */
async function ensureManagerLoaded() {
  const paramId = Number(route.params.id)
  // Se já está logado e o id bate, ok; caso contrário, busca e seta.
  if (!userStore.isLoggedIn || userStore.id !== paramId) {
    const u = await fetchUserById(paramId)
    userStore.setUser(u)
  }
}

/* Carregar equipe */
async function reloadTeam() {
  loading.value = true
  error.value = ''
  try {
    await ensureManagerLoaded()
    const managerId = userStore.id
    const arr = await fetchTeamByManager(managerId)
    team.value = Array.isArray(arr) ? arr : []
    theme.change(userStore.themeColor)
  } catch (e) {
    error.value = e?.message || 'Não foi possível carregar a equipe.'
  } finally {
    loading.value = false
  }
}

/* Computeds para header do gestor */
const managerName = computed(() => userStore.name || 'Gestor')
const managerEmail = computed(() => userStore.email || 'email@empresa.com')
const managerAvatar = computed(() =>
  userStore.avatarUrl ? `/${userStore.avatarUrl}` : DEFAULT_AVATAR,
)

/* Avatar do usuário da lista */
function userAvatar(u) {
  return u?.avatarUrl ? `/${u.avatarUrl}` : DEFAULT_AVATAR
}

/* Filtro local por nome/e-mail */
const filteredUsers = computed(() => {
  const q = (search.value || '').toLowerCase().trim()
  if (!q) return team.value
  return team.value.filter((u) => {
    const name = String(u.name || '').toLowerCase()
    const email = String(u.email || '').toLowerCase()
    return name.includes(q) || email.includes(q)
  })
})

/* Lifecycle */
onMounted(reloadTeam)

/* Se o :id do gestor mudar (navegação), recarrega */
watch(
  () => route.params.id,
  async () => {
    await reloadTeam()
  },
)
const links = ['Dashboard', 'Messages', 'Profile', 'Updates']
</script> -->
