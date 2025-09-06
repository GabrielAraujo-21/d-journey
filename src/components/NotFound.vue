<template>
  <v-container class="py-12">
    <v-row justify="center">
      <v-col cols="12" sm="10" md="8" lg="6">
        <v-card class="glass-panel pa-8 text-center" rounded="xl" elevation="10">
          <v-avatar size="72" class="mb-4" color="primary" rounded="lg">
            <v-icon size="40">mdi-emoticon-sad-outline</v-icon>
          </v-avatar>

          <h1 class="text-h4 font-weight-bold mb-2">404 — Página não encontrada</h1>
          <p class="text-body-2 text-medium-emphasis mb-6">
            A página que você procura pode ter sido movida, renomeada ou não existe.
          </p>

          <div class="d-flex gap-3 justify-center">
            <v-btn class="dj-gradient" prepend-icon="mdi-home" :to="{ path: '/' }">
              Ir para a página inicial
            </v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-arrow-left" @click="$router.back()">
              Voltar
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // título amigável (opcional)
  document.title = '404 • d-journey'
})
</script>

<style scoped>
/* pequenos ajustes visuais */
.v-avatar {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}
</style>
