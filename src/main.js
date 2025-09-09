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

// Instância do Vuetify
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
})

// Bootstrap da aplicação
import { useUserStore } from '@/stores/user'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// reidrata o usuário ANTES de ativar as rotas
const userStore = useUserStore()
userStore.bootstrap()

app.use(router)
app.use(vuetify)

// Dica: o tema será aplicado no Login ao entrar
// e no layout Usuario.vue ao montar (ver arquivo).

app.mount('#app')
