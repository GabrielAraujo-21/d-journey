// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '@/services/api' // seu client (dev/prod auto)

const hasWindow = typeof window !== 'undefined'
const STORAGE_KEY = 'auth.session'

const STORAGE = {
  get() {
    if (!hasWindow) return null
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY))
    } catch {
      return null
    }
  },
  set(val) {
    if (!hasWindow) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      console.warn('Falha ao salvar sessão no localStorage.' + e)
    }
  },
  remove() {
    if (!hasWindow) return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.warn('Falha ao remover sessão do localStorage.' + e)
    }
  },
}

function setHttpAuthHeader(tokenType, token) {
  const value = token ? `${tokenType} ${token}` : ''
  try {
    if (http?.setAuthToken) http.setAuthToken(value)
    else if (http?.defaults?.headers) {
      if (!http.defaults.headers.common) http.defaults.headers.common = {}
      http.defaults.headers.common['Authorization'] = value
    } else if (http?.headers) {
      http.headers['Authorization'] = value
    }
  } catch (e) {
    console.warn('Falha ao definir Authorization no http: ' + e)
  }
}

export const useAuthStore = defineStore('auth', () => {
  // sessão
  const accessToken = ref(null)
  const refreshToken = ref(null)
  const tokenType = ref('Bearer')
  const expiresAt = ref(null)
  const loading = ref(false)
  const error = ref('')

  // THEME: preferência escolhida antes do login (ex.: toggle na tela)
  const pendingTheme = ref(null) // 'light' | 'dark' | null

  // conta logada (separa de userStore)
  const account = ref(null) // { id, name, email, PerfilTipoId, avatarUrl, themeColor, ... }
  const accountId = computed(() => account.value?.id ?? null)

  let refreshTimerId = null

  const isAuthenticated = computed(() => {
    if (!accessToken.value) return false
    if (!expiresAt.value) return true
    return Date.now() < Number(expiresAt.value)
  })
  const remainingSeconds = computed(() =>
    !expiresAt.value
      ? null
      : Math.max(0, Math.floor((Number(expiresAt.value) - Date.now()) / 1000)),
  )
  const authHeader = computed(() =>
    accessToken.value ? `${tokenType.value} ${accessToken.value}` : '',
  )

  function persist() {
    STORAGE.set({
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      tokenType: tokenType.value,
      expiresAt: expiresAt.value,
      account: account.value, // persiste conta
    })
  }

  function scheduleRefresh() {
    if (refreshTimerId) {
      clearTimeout(refreshTimerId)
      refreshTimerId = null
    }
    if (!expiresAt.value) return
    const ms = Number(expiresAt.value) - Date.now() - 30_000
    if (ms <= 0) return
    refreshTimerId = setTimeout(() => {
      refresh().catch((e) => {
        console.warn('Falha ao atualizar token:', e)
      })
    }, ms)
  }

  function setSession({
    accessToken: at,
    refreshToken: rt,
    tokenType: tt = 'Bearer',
    expiresIn,
    expiresAtMs,
  }) {
    accessToken.value = at ?? null
    refreshToken.value = rt ?? null
    tokenType.value = tt ?? 'Bearer'
    expiresAt.value =
      expiresAtMs != null
        ? Number(expiresAtMs)
        : typeof expiresIn === 'number'
          ? Date.now() + expiresIn * 1000
          : null
    setHttpAuthHeader(tokenType.value, accessToken.value)
    persist()
    scheduleRefresh()
  }

  // conta logada
  function setAccount(u) {
    account.value = u || null
    persist()
  }
  function clearAccount() {
    account.value = null
    persist()
  }

  function clearSession() {
    accessToken.value = null
    refreshToken.value = null
    tokenType.value = 'Bearer'
    expiresAt.value = null
    error.value = ''
    clearAccount() // limpa conta ao limpar sessão

    setHttpAuthHeader('', '')
    STORAGE.remove()
    if (refreshTimerId) {
      clearTimeout(refreshTimerId)
      refreshTimerId = null
    }
  }

  function ensureAuthHeader() {
    setHttpAuthHeader(tokenType.value, accessToken.value)
  }

  function bootstrap({ applyTheme } = {}) {
    if (accessToken.value) return
    const saved = STORAGE.get()
    if (!saved) return
    setSession({
      accessToken: saved.accessToken,
      refreshToken: saved.refreshToken,
      tokenType: saved.tokenType || 'Bearer',
      expiresAtMs: saved.expiresAt ?? null,
    })
    if (saved.account) setAccount(saved.account) // restaura conta

    if (applyTheme) {
      const desired = saved.account?.themeColor ?? 'light'
      applyTheme(desired)
    }
  }

  async function signIn({ email, password } = {}) {
    loading.value = true
    error.value = ''
    try {
      const resp = await http.post('/auth/login', { email, password })
      const data = resp?.data ?? resp
      const at = data?.access_token ?? data?.accessToken
      const rt = data?.refresh_token ?? data?.refreshToken
      const tt = data?.token_type ?? data?.tokenType ?? 'Bearer'
      const exp = data?.expires_in ?? data?.expiresIn ?? 3600
      const user = data?.user ?? null

      setSession({ accessToken: at, refreshToken: rt, tokenType: tt, expiresIn: exp })
      setAccount(user) // guarda conta logada (não mexe no userStore)
      return true
    } catch (e) {
      error.value = e?.message || 'Falha ao autenticar.'
      clearSession()
      return false
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    if (!refreshToken.value) return false
    try {
      const resp = await http.post('/auth/refresh', { refresh_token: refreshToken.value })
      const data = resp?.data ?? resp
      const at = data?.access_token ?? data?.accessToken
      const rt = data?.refresh_token ?? data?.refreshToken ?? refreshToken.value
      const tt = data?.token_type ?? data?.tokenType ?? tokenType.value
      const exp = data?.expires_in ?? data?.expiresIn ?? 3600
      setSession({ accessToken: at, refreshToken: rt, tokenType: tt, expiresIn: exp })
      return true
    } catch {
      clearSession()
      return false
    }
  }

  async function signOut({ notifyServer = true } = {}) {
    try {
      if (notifyServer && accessToken.value) {
        try {
          await http.post('/auth/logout')
        } catch (e) {
          console.warn('Falha ao notificar logout no servidor:', e)
        }
      }
    } finally {
      clearSession() // não toca no userStore
    }
  }

  // =================== THEME (encapsulado) ===================
  /**
   * changeTheme(next, { applyTheme })
   * - Se já estiver no tema desejado, não faz nada.
   * - Se estiver logado: persiste em /users/:id (best effort).
   * - Sempre aplica na UI via applyTheme(next).
   * - Pode ser chamado antes (pendente) ou depois do login.
   */
  async function changeTheme(next, { applyTheme } = {}) {
    const normalize = (v) => (v === 'dark' ? 'dark' : 'light')
    const desired = normalize(next)
    const current = account.value?.themeColor ?? pendingTheme.value ?? 'light'

    if (desired === current) {
      // garante que a UI reflita o estado atual (idempotente)
      if (applyTheme) applyTheme(desired)
      return { changed: false, theme: desired }
    }

    loading.value = true
    try {
      // Se já tem conta, tenta persistir no usuário
      if (account.value?.id) {
        try {
          await http.patch(`/users/${encodeURIComponent(account.value.id)}`, {
            themeColor: desired,
          })
        } catch (e) {
          // best-effort: seguimos mesmo que o patch falhe
          console.warn('Falha ao salvar tema no servidor:', e)
        }
        // espelha localmente
        account.value = { ...account.value, themeColor: desired }
        persist()
      } else {
        // antes do login, guardamos a escolha para comitar depois
        pendingTheme.value = desired
      }

      if (applyTheme) applyTheme(desired)
      return { changed: true, theme: desired }
    } finally {
      loading.value = false
    }
  }

  /**
   * syncThemeOnLogin({ applyTheme })
   * - Ao concluir o login:
   *   - Se havia um tema pendente (selecionado antes), prioriza-o.
   *   - Se for diferente do salvo no usuário, faz patch e atualiza a conta.
   *   - Aplica na UI e limpa o pendente.
   * - Use este método ANTES de navegar para o layout.
   */
  async function syncThemeOnLogin({ applyTheme } = {}) {
    const normalize = (v) => (v === 'dark' ? 'dark' : 'light')
    const desired = normalize(pendingTheme.value ?? account.value?.themeColor ?? 'light')
    const saved = normalize(account.value?.themeColor ?? 'light')

    // Se diferir do salvo no usuário, tenta persistir
    if (account.value?.id && desired !== saved) {
      loading.value = true
      try {
        try {
          await http.patch(`/users/${encodeURIComponent(account.value.id)}`, {
            themeColor: desired,
          })
        } catch (e) {
          console.warn('Falha ao salvar tema no servidor (sync):', e)
        }
        account.value = { ...account.value, themeColor: desired }
        persist()
      } finally {
        loading.value = false
      }
    }

    if (applyTheme) applyTheme(desired)
    pendingTheme.value = null
    return desired
  }
  // =================== /THEME ===================

  return {
    // sessão
    accessToken,
    refreshToken,
    tokenType,
    expiresAt,
    loading,
    error,
    isAuthenticated,
    remainingSeconds,
    authHeader,

    // conta logada
    account,
    accountId,
    setAccount,
    clearAccount,

    // THEME
    changeTheme,
    syncThemeOnLogin,
        
    // ações
    signIn,
    refresh,
    signOut,
    setSession,
    clearSession,
    bootstrap,
    ensureAuthHeader,
  }
})
