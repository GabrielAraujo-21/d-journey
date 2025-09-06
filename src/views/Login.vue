<template>
  <v-container class="login-wrap" fluid>
    <!-- Top bar: logo + toggle de tema -->
    <header class="topbar d-flex align-center justify-space-between">
      <div class="brand d-flex align-center ga-2">
        <img class="logo" :src="logoUrl" alt="d-journey" />
        <span class="text-h6 font-weight-bold app-name">
          <span>d</span>
          <span class="hifem">-</span>
          <span class="font-weight-light journey">journey</span>
        </span>
      </div>

      <v-tooltip text="Alternar tema" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            variant="tonal"
            icon
            aria-label="Alternar tema claro/escuro"
            @click="toggleTheme"
          >
            <v-icon :icon="isDark ? 'mdi-weather-sunny' : 'mdi-moon-waning-crescent'" />
          </v-btn>
        </template>
      </v-tooltip>
    </header>

    <!-- Conteúdo central -->
    <v-row class="fill-height" align="center" justify="center">
      <v-col cols="10" sm="10" md="8" lg="5">
        <v-card class="glass p-card" elevation="10" rounded="xl">
          <v-card-text class="pa-8">
            <div class="text-center mb-6">
              <img class="logo-lg mx-auto mb-3" :src="logoUrl" alt="d-journey" />
              <h1 class="text-h5 text-md-h4 font-weight-bold mb-1">
                Bem-vindo ao
                <span>d</span>
                <span class="hifem">-</span>
                <span class="font-weight-light journey">journey</span>
              </h1>
              <p class="text-medium-emphasis">
                Otimize e controle seu tempo e foque no que importa.
              </p>
            </div>

            <v-alert v-if="state.error" type="error" variant="tonal" class="mb-4" border="start">
              {{ state.error }}
            </v-alert>

            <!-- <v-form ref="formRef" @submit.prevent="onSubmit" validate-on="submit"> -->
            <v-form ref="formRef" validate-on="submit">
              <v-text-field
                v-model="state.email"
                label="E-mail"
                type="email"
                name="email"
                autocomplete="email"
                variant="outlined"
                density="comfortable"
                :rules="[rules.required, rules.email]"
                prepend-inner-icon="mdi-email-outline"
                rounded="lg"
                class="mb-4"
                clearable
              />

              <v-text-field
                v-model="state.password"
                :type="state.showPassword ? 'text' : 'password'"
                label="Senha"
                name="current-password"
                autocomplete="current-password"
                variant="outlined"
                density="comfortable"
                :rules="[rules.required, rules.min(6)]"
                :append-inner-icon="state.showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                @click:append-inner="state.showPassword = !state.showPassword"
                prepend-inner-icon="mdi-lock-outline"
                rounded="lg"
                class="mb-1"
                clearable
              />

              <div class="d-flex align-center justify-space-between mb-4">
                <v-checkbox
                  v-model="state.remember"
                  color="primary"
                  hide-details
                  density="compact"
                  label="Lembrar de mim"
                />
                <RouterLink class="text-primary text-decoration-none" to="/recuperar-senha">
                  Esqueci minha senha
                </RouterLink>
              </div>

              <v-btn
                type="button"
                block
                size="large"
                class="mb-4"
                color="primary"
                :loading="state.loading"
                @click="((userAdmin = false), onSubmit())"
              >
                Entrar (Usuário)
              </v-btn>

              <v-btn
                type="button"
                block
                size="large"
                class="mb-4"
                color="primary"
                :loading="state.loading"
                @click="((userAdmin = true), onSubmit())"
              >
                Entrar (Admin)
              </v-btn>

              <!-- <div class="d-flex align-center ga-3 mb-4">
                <v-divider />
                <span class="text-caption text-medium-emphasis">ou</span>
                <v-divider />
              </div> -->

              <!-- <div class="d-flex flex-column ga-3">
                <v-btn
                  variant="outlined"
                  prepend-icon="mdi-google"
                  :disabled="state.loading"
                  @click="oauth('google')"
                >
                  Entrar com Google
                </v-btn>
                <v-btn
                  variant="outlined"
                  prepend-icon="mdi-microsoft"
                  :disabled="state.loading"
                  @click="oauth('microsoft')"
                >
                  Entrar com Microsoft
                </v-btn>
              </div> -->
            </v-form>
          </v-card-text>

          <v-card-actions class="justify-center pb-6 px-8">
            <p class="text-caption text-disabled text-center">
              Ao entrar, você concorda com nossos
              <RouterLink to="/termos" class="text-primary text-decoration-none">Termos</RouterLink>
              e
              <RouterLink to="/privacidade" class="text-primary text-decoration-none"
                >Privacidade</RouterLink
              >.
            </p>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Detalhes decorativos -->
    <div class="blob blob-1" />
    <div class="blob blob-2" />
  </v-container>
</template>

<script setup>
/**
 * Login.vue — d-journey
 * Tela de login moderna com Vuetify 3 (Composition API, JS).
 * - Validação (e-mail/senha)
 * - Alternância de tema (claro/escuro)
 * - Mostrar/ocultar senha
 * - Botões OAuth (Google/Microsoft) — stubs
 * - Acessível e responsiva (glassmorphism + gradiente)
 */

import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'


const logoUrl = '/d-journey-logo-mark.svg'

const router = useRouter()
const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

const toggleTheme = () => {
  
  theme.global.name.value = isDark.value ? 'light' : 'dark'
}

const formRef = ref(null)
const state = reactive({
  email: '',
  password: '',
  remember: true,
  showPassword: false,
  loading: false,
  error: null,
})
const userAdmin = ref(false)

const rules = {
  required: (v) => !!v || v === 0 || 'Campo obrigatório',
  email: (v) => /.+@.+\..+/.test(String(v).toLowerCase()) || 'E-mail inválido',
  min: (len) => (v) => String(v || '').length >= len || `Mínimo de ${len} caracteres`,
}

const canSubmit = computed(() => !state.loading && state.email && state.password)

async function onSubmit() {
  // if (!canSubmit.value) return

  // const res = await formRef.value?.validate()
  // if (res && res.valid === false) return

  state.loading = true
  state.error = null

  try {
    // TODO: Substituir por chamada real de autenticação.
    await new Promise((r) => setTimeout(r, 1500))

    if (userAdmin.value) {
      // Exemplo simples: navega para área autenticada (layout "admins")
      router.push('/admin/2')
      return
    }
    // Exemplo simples: navega para área autenticada (layout "users")
    router.push('/user/1')
  } catch (err) {
    state.error = 'Falha ao autenticar. Tente novamente.'
    // console.error(err)
  } finally {
    state.loading = false
  }
}

// function oauth(provider) {
//   if (state.loading) return
//   // TODO: Direcionar para fluxo OAuth do seu backend
//   state.error = null
//   state.loading = true
//   setTimeout(() => {
//     state.loading = false
//     router.push('/users')
//   }, 600)

// }
</script>

<style scoped>
/* Fundo com gradiente sutil + textura */
.login-wrap {
  min-height: 100dvh;
  position: relative;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(124, 58, 237, 0.14), transparent 60%),
    radial-gradient(1000px 500px at 110% 0%, rgba(6, 182, 212, 0.14), transparent 65%);
  backdrop-filter: blur(0.5px);
  padding-block: 24px;
}

/* Topbar */
.topbar {
  max-width: 1100px;
  margin-inline: auto;
  padding: 8px 12px 16px;
}
.brand .logo :deep(svg) {
  display: block;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}
.logo {
  width: 28px;
  height: 28px;
}
.logo-lg {
  width: 44px;
  height: 44px;
}
.app-name {
  letter-spacing: 0.4px;
}

/* Cartão com efeito vidro */
.glass {
  background: color-mix(in oklab, var(--v-surface), transparent 8%);
  border: 1px solid color-mix(in oklab, var(--v-outline-variant), transparent 70%);
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
}

/* Espaçamento do card em telas menores */
.p-card {
  padding: clamp(0px, 1.5vw, 8px);
}

/* Blobs decorativos */
.blob {
  position: absolute;
  filter: blur(60px);
  opacity: 0.28;
  pointer-events: none;
  z-index: 0;
}
.blob-1 {
  width: 360px;
  height: 360px;
  bottom: -80px;
  left: -60px;
  background: conic-gradient(from 120deg, #7c3aed, #06b6d4);
}
.blob-2 {
  width: 300px;
  height: 300px;
  top: 10%;
  right: -40px;
  background: conic-gradient(from 210deg, #06b6d4, #7c3aed);
}

.journey {
  color: #06b6d4;
}

.hifem {
  color: #ed673a;
}
/* Pequenos ajustes de tipografia */
:deep(.v-field__input) {
  font-size: 0.975rem;
}
</style>
