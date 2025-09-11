<template>
  <v-container class="login-wrap" fluid>
    <header class="topbar d-flex align-center justify-end">
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

    <v-row class="fill-height" align="center" justify="center">
      <v-col cols="10" sm="10" md="8" lg="5">
        <v-card class="glass p-card" elevation="10" rounded="xl">
          <v-card-text class="pa-8">
            <div class="text-center mb-6">
              <img
                class="logo-lg mx-auto mb-3"
                :src="logoUrl"
                alt="d-journey"
                width="44"
                height="44"
                decoding="async"
                loading="eager"
                fetchpriority="high"
              />
              <h1 class="text-h5 text-md-h4 font-weight-bold mb-1">
                Bem-vindo ao <span>d</span><span class="hifem">-</span
                ><span class="font-weight-light journey">journey</span>
              </h1>
              <p class="text-medium-emphasis">
                Otimize e controle seu tempo e foque no que importa.
              </p>
            </div>

            <v-alert v-if="state.error" type="error" variant="tonal" class="mb-4" border="start">
              {{ state.error }}
            </v-alert>

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
                disabled
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
                disabled
              />

              <div class="d-flex align-center justify-space-between mb-4">
                <v-checkbox
                  v-model="state.remember"
                  color="primary"
                  hide-details
                  density="compact"
                  label="Lembrar de mim"
                  :model-value="true"
                  disabled
                />
                <RouterLink class="text-primary text-decoration-none" to="/recuperar-senha"
                  >Esqueci minha senha</RouterLink
                >
              </div>

              <v-card variant="tonal" class="pa-3 mb-4 tracker-card" color="primary">
                <template #title>
                  <div class="d-flex align-center text-secondary">
                    <v-icon class="mr-2">mdi-information-outline</v-icon>
                    <span>Ver exemplo da aplicação como:</span>
                  </div>
                </template>

                <v-radio-group v-model="userId" class="mb-4 pl-16" row>
                  <v-radio label="Usuário" :value="1" />
                  <v-radio label="Administrador" :value="2" />
                </v-radio-group>
              </v-card>

              <v-btn
                type="button"
                block
                size="large"
                class="mb-4"
                color="primary"
                :loading="state.loading"
                @click="onSubmit()"
              >
                Entrar
              </v-btn>

              <!-- <v-btn
                type="button"
                block
                size="large"
                class="mb-4"
                color="primary"
                :loading="state.loading"
                @click="onSubmit()"
              >
                Entrar (Demostração de Gestor)
              </v-btn> -->
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

    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { getUserById } from '@/services/api'

const router = useRouter()
const theme = useTheme()
const auth = useAuthStore()

const userId = ref(null)

const isDark = computed(() => theme.global.current.value.dark)
const applyTheme = (mode) => theme.change(mode === 'dark' ? 'dark' : 'light')

// === NOVO: delega a troca para o store ===
const toggleTheme = async () => {
  const next = isDark.value ? 'light' : 'dark'
  await auth.changeTheme(next, { applyTheme })
}

const state = ref({
  email: '',
  password: '',
  showPassword: false,
  remember: false,
  loading: false,
  error: null,
})
const logoUrl = '/d-journey-logo-mark.svg'
const rules = {
  required: (v) => !!v || v === 0 || 'Campo obrigatório',
  email: (v) => /.+@.+\..+/.test(String(v).toLowerCase()) || 'E-mail inválido',
  min: (len) => (v) => String(v || '').length >= len || `Mínimo de ${len} caracteres`,
}
async function onSubmit() {
  state.value.loading = true
  state.value.error = null
  try {
    const targetId = userId.value
    const u = await getUserById(targetId)

    // Seta sessão + conta
    auth.setSession({
      accessToken: crypto.randomUUID(),
      refreshToken: crypto.randomUUID(),
      tokenType: 'Bearer',
      expiresIn: 24 * 60 * 60,
    })
    auth.setAccount(u)

    // === NOVO: aplica/sincroniza tema ANTES de navegar ===
    await auth.syncThemeOnLogin({ applyTheme })

    // Agora pode navegar para o layout
    if (u?.PerfilTipoId === 3) router.push(`/admin/${targetId}`)
    else router.push(`/user/${targetId}`)
  } catch (err) {
    state.value.error = 'Falha ao autenticar. Tente novamente.' + (err?.message || '')
  } finally {
    // loader só sai após o tema ter sido aplicado/sincronizado
    state.value.loading = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100dvh;
  position: relative;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(124, 58, 237, 0.14), transparent 60%),
    radial-gradient(1000px 500px at 110% 0%, rgba(6, 182, 212, 0.14), transparent 65%);
  backdrop-filter: blur(0.5px);
  padding-block: 24px;
}
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
.glass {
  background: color-mix(in oklab, var(--v-surface), transparent 8%);
  border: 1px solid color-mix(in oklab, var(--v-outline-variant), transparent 70%);
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
}
.p-card {
  padding: clamp(0px, 1.5vw, 8px);
}
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
:deep(.v-field__input) {
  font-size: 0.975rem;
}
</style>
