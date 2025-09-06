<template>
  <v-app id="inspire">
    <v-app-bar flat>
      <v-container class="mx-auto d-flex align-center justify-center">
        <!-- <v-avatar class="me-4" size="32" image="/sem-imagem.png"></v-avatar> -->
        <v-list-item
          prepend-avatar="/sem-imagem.png"
          subtitle="user-admin@admin.com"
          title="Admin User"
        ></v-list-item>
        <v-btn v-for="link in links" :key="link" :text="link" variant="text"></v-btn>

        <v-spacer></v-spacer>

        <v-responsive max-width="160">
          <v-text-field
            density="compact"
            label="Pesquisar"
            rounded="lg"
            variant="solo-filled"
            flat
            hide-details
            single-line
          ></v-text-field>
        </v-responsive>

        <v-divider class="mx-3 align-self-center" length="24" thickness="2" vertical></v-divider>
        <v-btn icon="mdi-logout" to="/" />
      </v-container>
    </v-app-bar>

    <v-main class="bg-grey-lighten-3">
      <v-container>
        <v-row>
          <v-col cols="2">
            <v-sheet rounded="lg">
              <v-list rounded="lg">
                <v-list-item v-for="n in 5" :key="n" :title="`List Item ${n}`" link></v-list-item>

                <v-divider class="my-2"></v-divider>

                <v-list-item color="grey-lighten-4" title="Refresh" link></v-list-item>
              </v-list>
            </v-sheet>
          </v-col>

          <v-col>
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
const links = ['Dashboard', 'Messages', 'Profile', 'Updates']
</script>
