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
                />
                <RouterLink class="text-primary text-decoration-none" to="/recuperar-senha"
                  >Esqueci minha senha</RouterLink
                >
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
                Entrar (Demostração de Usuário)
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
                Entrar (Demostração de Gestor)
              </v-btn>
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

    <div class="blob blob-1" />
    <div class="blob blob-2" />
  </v-container>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useUserStore } from '@/stores/user'
import { getUserById, patchUser } from '@/services/api' // ⟵ usa o service

const logoUrl = '/d-journey-logo-mark.svg'

const router = useRouter()
const theme = useTheme()
const user = useUserStore()
const isDark = computed(() => theme.global.current.value.dark)

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

/** Alternância de tema respeitando o atributo themeColor do usuário */
const toggleTheme = async () => {
  const next = isDark.value ? 'light' : 'dark'
  if (user.isLoggedIn) {
    if (user.themeColor !== next) {
      user.themeColor = next
      // Atualiza também no backend fake (opcional)
      try {
        await patchUser(user.id, { themeColor: next })
      } catch {}
      // Regrava no localStorage via setUser para manter a persistência
      user.setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        PerfilTipoId: user.PerfilTipoId,
        avatarUrl: user.avatarUrl,
        escalaId: user.escalaId,
        tipoContratoId: user.tipoContratoId,
        ativo: user.ativo,
        themeColor: next,
      })
    }
  }
  theme.global.name.value = next
}

/**
 * onSubmit:
 * - busca usuário (ID 1 ou 2) COM RELACIONAMENTOS (embed + expand)
 * - grava no Pinia com setUser(u) (mantém sua nomenclatura)
 * - aplica o tema salvo
 * - navega para /user/:id ou /admin/:id conforme PerfilTipoId
 */
async function onSubmit() {
  state.loading = true
  state.error = null

  try {
    const targetId = userAdmin.value ? 2 : 1

    const u = await getUserById(targetId, {
      embed: ['escalas', 'registros'], // filhos por FK userId
      expand: ['PerfilTipo', 'tipoContrato'], // pais referenciados no user
    })

    // Você terá u.escalas, u.registros, u.PerfilTipo, u.tipoContrato disponíveis aqui
    // Mantemos sua store como está (sem mudar shape)
    user.setUser(u)

    theme.global.name.value = user.themeColor || 'light'

    if (u.PerfilTipoId === 3) {
      router.push(`/admin/${targetId}`)
    } else {
      router.push(`/user/${targetId}`)
    }
  } catch (err) {
    state.error = 'Falha ao autenticar. Tente novamente.'
  } finally {
    state.loading = false
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
