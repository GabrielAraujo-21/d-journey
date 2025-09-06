<template>
  <v-app id="inspire">
    <!-- Barra Lateral -->
    <v-navigation-drawer v-model="drawer" expand-on-hover permanent rail>
     
      <v-list>
        <v-list-item
          prepend-avatar="/sem-imagem.png"
          subtitle="user@user.com"
          title="Normal User"
        ></v-list-item>
      </v-list>

      <v-divider></v-divider>

      <v-list density="compact" rounded="lg" nav>
        <v-list-item
          prepend-icon="mdi-clock-edit-outline"
          title="Check-Point Diário"
          value="check-point"
          to="/user/1"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-calendar-text-outline"
          title="Histórico Mensal"
          value="historico-mensal"
          :to="{ name: 'historico-mensal' }"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Barra de aplicativo -->
    <v-app-bar>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

      <v-app-bar-title>
        <span>d</span>
        <span class="hifem">-</span>
        <span class="font-weight-light journey">journey</span>
      </v-app-bar-title>

      <v-divider class="mx-3 align-self-center" length="24" thickness="2" vertical></v-divider>

      <template v-slot:append>
        <v-btn icon="mdi-logout" to="/"></v-btn>
      </template>
    </v-app-bar>

    <!-- Corpo do layout -->
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'

const drawer = ref(null)
</script>

<style scoped>
.journey {
  color: #06b6d4;
}

.hifem {
  color: #ed673a;
}
</style>
