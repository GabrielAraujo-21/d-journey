<template>
  <v-app id="inspire">
    <v-layout>
      <v-navigation-drawer v-model="drawer" expand-on-hover absolute permanent rail>
        <v-list>
          <v-list-item :prepend-avatar="authAvatarUrl" :subtitle="authEmail" :title="authName" />
        </v-list>

        <v-divider></v-divider>

        <v-list :lines="false" density="compact" nav>
          <v-list-item
            v-for="(item, i) in items"
            :key="i"
            :value="item"
            color="primary"
            :to="item.to"
            link
            :exact="true"
            active-class="router-link-exact-active"
          >
            <template #prepend>
              <v-icon :icon="item.icon"></v-icon>
            </template>

            <v-list-item-title v-text="item.text"></v-list-item-title>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>

      <v-app-bar permanent>
        <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

        <v-app-bar-title>
          <img
            class="logo-lg mx-auto"
            :src="logoUrl"
            alt="d-journey"
            width="44"
            height="44"
            decoding="async"
            loading="eager"
            fetchpriority="high"
          />
        </v-app-bar-title>

        <v-divider class="mx-3 align-self-center" length="24" thickness="2" vertical></v-divider>

        <template #append>
          <!-- UX: primeiro navega pra login, depois limpa store/localStorage -->
          <v-btn icon="mdi-logout" @click="goLogout"></v-btn>
        </template>
      </v-app-bar>

      <v-main>
        <RouterView />
      </v-main>
    </v-layout>
  </v-app>
</template>

<script setup>
import { ref, onMounted, watchEffect, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { patchUser } from '@/services/api'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const theme = useTheme()
const auth = useAuthStore()

const logoUrl = '/d-journey-logo-mark.svg'

const authName = computed(() => auth.account?.name || '')
const authEmail = computed(() => auth.account?.email || '')
const authAvatarUrl = computed(() =>
  auth.account?.avatarUrl ? '/' + auth.account.avatarUrl : '/sem-imagem.png',
)

const items = [
  {
    text: 'Check-Point Diário',
    icon: 'mdi-clock-edit',
    to: { name: 'djourney', params: { id: route.params.id } },
  },
  {
    text: 'Histórico Mensal',
    icon: 'mdi-calendar-clock',
    to: { name: 'historico-mensal', params: { id: route.params.id } },
  },
]

const drawer = ref(null)

/**
 * Reidrata o usuário salvo (após refresh direto na rota)
 * e aplica o tema persistido.
 */
onMounted(() => {
  userStore.bootstrap()

  if (userStore.themeColor) {
    theme.change(userStore.themeColor)
  }
})

/** Reflete mudanças de tema vindas da store */
watchEffect(() => {
  if (userStore.themeColor) {
    theme.change(userStore.themeColor)
  }
})

/**
 * UX: primeiro sai da área autenticada (replace para não voltar com "Voltar"),
 * depois limpa a store/localStorage.
 */
async function goLogout() {
  // UX: sai da área autenticada primeiro
  await router.replace({ name: 'Login' })

  // marca conta logada como offline (se houver id)
  const id = auth.accountId
  if (id) {
    try {
      await patchUser(id, { onLine: false })
    } catch (e) {
      console.warn('Falha ao marcar conta como offline', e)
    }
  }

  // encerra sessão (limpa tokens/conta no authStore)
  await auth.signOut({ notifyServer: false })

  // (Opcional) Se quiser zerar o "usuário analisado" da app:
  // userStore.clear()
}
</script>

<style scoped></style>
