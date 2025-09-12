<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup>
import { onBeforeMount } from 'vue'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'

const theme = useTheme()
const auth = useAuthStore()

// Função única para aplicar o tema no Vuetify 3
const applyTheme = (mode) => {
  // Se você usa theme.change(), mantenha-o. Abaixo é a forma canônica no Vuetify 3:
  if (mode === 'dark') {
    theme.change('dark')
  } else {
    theme.change('light')
  }
}

onBeforeMount(async () => {
  // Restaura sessão + account do localStorage
  auth.bootstrap()

  // Descobre o tema desejado (salvo na conta) — fallback para 'light'
  const desired = auth.account?.themeColor ?? 'light'

  // Garante que a UI reflita o tema salvo (idempotente)
  // changeTheme já evita patch remoto quando não muda,
  // mas sempre chama applyTheme para garantir consistência visual.
  await auth.changeTheme(desired, { applyTheme })
})
</script>
