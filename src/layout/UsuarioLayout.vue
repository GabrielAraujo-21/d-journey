<template>
  <v-layout>
    <v-app-bar>
      <v-app-bar-title class="d-flex align-center">
        <v-avatar size="32" class="mr-2" color="secondary" rounded="lg">
          <v-icon>mdi-briefcase-clock</v-icon>
        </v-avatar>
        <span class="text-subtitle-1 font-weight-medium"> Área do Usuário • {{ user.name }} </span>
      </v-app-bar-title>

      <v-spacer />

      <v-tabs density="comfortable" align-tabs="end">
        <v-tab :to="{ name: 'djourney', params: { id: route.params.id } }" :exact="true">
          <v-icon start>mdi-calendar-check</v-icon>Diário
        </v-tab>
        <v-tab :to="{ name: 'historico-mensal', params: { id: route.params.id } }">
          <v-icon start>mdi-calendar-month</v-icon>Histórico Mensal
        </v-tab>
        <v-tab :to="{ name: 'logout' }"> <v-icon start>mdi-logout</v-icon>Sair </v-tab>
      </v-tabs>
    </v-app-bar>

    <v-main>
      <v-container fluid class="py-4">
        <router-view />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const user = useUserStore()

onMounted(async () => {
  await user.ensureHydratedById(Number(route.params.id))
})
</script>
