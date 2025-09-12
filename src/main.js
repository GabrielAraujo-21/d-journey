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

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = JSON.parse(localStorage.getItem('auth.session') || '{}')
    const mode = saved?.account?.themeColor
    return mode === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// Instância do Vuetify
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: getInitialTheme(),
    // themes: { light: {...}, dark: {...} } // se você define temas custom
  },
})

// Bootstrap da aplicação
import { useUserStore } from '@/stores/user'

// CSS global
import '@/assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// reidrata o usuário ANTES de ativar as rotas
const userStore = useUserStore()
userStore.bootstrap()

app.use(router)
app.use(vuetify)

import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()

auth.bootstrap() // restaura sessão (se existir)
auth.ensureAuthHeader() // injeta Authorization no http

// Dica: o tema será aplicado no Login ao entrar
// e no layout Usuario.vue ao montar (ver arquivo).

app.mount('#app')
