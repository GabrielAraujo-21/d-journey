// src/stores/user.js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  const id = ref(null)
  const name = ref('')
  const email = ref('')
  const PerfilTipoId = ref(null)
  const avatarUrl = ref('')
  const escalaId = ref(null)
  const tipoContratoId = ref(null)
  const themeColor = ref('light')
  const ativo = ref(false)

  const isLoggedIn = computed(() => id.value !== null)
  const AUTH_KEY = 'auth'

  function setUser(u) {
    id.value = u?.id ?? null
    name.value = u?.name ?? ''
    email.value = u?.email ?? ''
    PerfilTipoId.value = u?.PerfilTipoId ?? null
    avatarUrl.value = u?.avatarUrl ?? ''
    escalaId.value = u?.escalaId ?? null
    tipoContratoId.value = u?.tipoContratoId ?? null
    ativo.value = u?.ativo ?? false
    themeColor.value = u?.themeColor ?? 'light'

    try {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
          user: {
            id: id.value,
            name: name.value,
            email: email.value,
            PerfilTipoId: PerfilTipoId.value,
            avatarUrl: avatarUrl.value,
            escalaId: escalaId.value,
            tipoContratoId: tipoContratoId.value,
            ativo: ativo.value,
            themeColor: themeColor.value,
          },
        }),
      )
    } catch (error) {
      console.error('Error saving user data:', error)
    }
  }

  function clear() {
    id.value = null
    name.value = ''
    email.value = ''
    PerfilTipoId.value = null
    avatarUrl.value = ''
    escalaId.value = null
    tipoContratoId.value = null
    ativo.value = false
    themeColor.value = 'light'
    try {
      localStorage.removeItem(AUTH_KEY)
    } catch (error) {
      console.error('Error clearing user data:', error)
    }
  }

  // alias sem mudar suas nomenclaturas/fluxos existentes
  function logout() {
    clear()
  }

  function bootstrap() {
    if (id.value !== null) return
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed?.user) return
      setUser(parsed.user)
    } catch (error) {
      console.error('Error bootstrapping user:', error)
    }
  }

  return {
    id,
    name,
    email,
    PerfilTipoId,
    avatarUrl,
    escalaId,
    tipoContratoId,
    ativo,
    themeColor,
    isLoggedIn,
    setUser,
    clear,
    logout,
    bootstrap,
  }
})
