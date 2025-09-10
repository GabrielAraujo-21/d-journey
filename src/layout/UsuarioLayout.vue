<template>
  <v-app id="inspire">
    <v-layout>
      <v-navigation-drawer v-model="drawer" expand-on-hover absolute permanent rail>
        <v-list>
          <v-list-item
            :prepend-avatar="'/' + userStore.avatarUrl"
            :subtitle="userStore.email"
            :title="userStore.name"
          />
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

          <!-- <span>d</span><span class="hifem">-</span
          ><span class="font-weight-light journey">journey</span> -->
        </v-app-bar-title>

        <v-divider class="mx-3 align-self-center" length="24" thickness="2" vertical></v-divider>

        <template #append>
          <!-- Redireciona primeiro; limpa depois -->
          <v-btn icon="mdi-logout" @click="goLogout"></v-btn>
        </template>
      </v-app-bar>

      <v-main>
        <router-view />
      </v-main>
    </v-layout>
  </v-app>
</template>

<script setup>
import { ref, onMounted, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const theme = useTheme()

const logoUrl = '/d-journey-logo-mark.svg'

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

// aplica o tema salvo do usuário ao montar / reidratar
onMounted(() => {
  if (userStore.themeColor) {
    theme.change(userStore.themeColor)
  }
})

// reflete mudanças de tema vindas da store
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
  await router.replace({ name: 'Login' }) // ou { path: '/' }
  userStore.clear()
}
</script>

<style scoped>
.journey {
  color: #06b6d4;
}
.hifem {
  color: #ed673a;
}
</style>
