// Core Vue
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Vuetify (estilos SEMPRE antes dos seus estilos)
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Ícones (MDI) — CSS + mapeamento do set
import '@mdi/font/css/materialdesignicons.css'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// App shell
import App from './App.vue'
import router from './router'

// Seus estilos globais (devem vir após 'vuetify/styles' para sobrescrever)
// import '@/assets/main.css'

// Instância do Vuetify
// - components/directives: ajuda o tree-shaking e evita warnings
// - icons: configura o set MDI
// - theme: se quiser, dá pra ligar aqui; caso contrário, use o tema padrão
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  // theme: { defaultTheme: 'djourneyLight', themes: { ... } }, // opcional
})

/* Bootstrap da aplicação */
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vuetify)
app.mount('#app')
