// src/stores/user.js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { http } from '@/services/api' // usa dev/prod automaticamente

/**
 * Helpers internos (não expostos) — simplicidade > sofisticação
 */

// SSR-safe localStorage
const hasWindow = typeof window !== 'undefined'

const STORAGE = {
  get(key) {
    if (!hasWindow) return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, val) {
    if (!hasWindow) return
    try {
      window.localStorage.setItem(key, val)
    } catch {
      // falha silenciosa
    }
  },
  remove(key) {
    if (!hasWindow) return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // falha silenciosa
    }
  },
}

// valida e retorna Date ou null
function toValidDate(v) {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

// calcula cutoff com base em now e unidade (mantendo sua semântica)
function makeCutoff({ days = 0, months = 0, years = 0 }) {
  const now = new Date()
  const cutoff = new Date(now)
  if (days) cutoff.setDate(now.getDate() - days)
  if (months) cutoff.setMonth(now.getMonth() - months) // “1 mês atrás”, não 30 dias
  if (years) cutoff.setFullYear(now.getFullYear() - years)
  return cutoff
}

// filtro genérico reaproveitado pelos derivados
function filterRegistrosDesde(list, cutoff) {
  if (!Array.isArray(list) || list.length === 0) return []
  const t = cutoff.getTime()
  return list.filter((r) => {
    const d = toValidDate(r?.data)
    return d && d.getTime() >= t
  })
}

export const useUserStore = defineStore('user', () => {
  // estado base
  const id = ref(null)
  const name = ref('')
  const email = ref('')
  const PerfilTipoId = ref(null)
  const avatarUrl = ref('')
  const escalaId = ref(null)
  const tipoContratoId = ref(null)
  const themeColor = ref('light')
  const ativo = ref(false)
  const loading = ref(false)
  const error = ref('')
  const onLine = ref(null)

  /* Gestor */
  const team = ref([])

  const registros = ref([]) // base

  // derivados reativos (não criar/atribuir computeds dentro de setUser)
  const registrosSemanal = computed(() =>
    filterRegistrosDesde(registros.value, makeCutoff({ days: 7 })),
  )

  const registrosMensal = computed(() =>
    filterRegistrosDesde(registros.value, makeCutoff({ months: 1 })),
  )

  const registrosAnual = computed(() =>
    filterRegistrosDesde(registros.value, makeCutoff({ years: 1 })),
  )

  const isLoggedIn = computed(() => id.value != null)
  const AUTH_KEY = 'auth'

  // chaves que persistimos (evita repetir manualmente)
  const PERSIST_KEYS = [
    'id',
    'name',
    'email',
    'PerfilTipoId',
    'avatarUrl',
    'escalaId',
    'tipoContratoId',
    'ativo',
    'themeColor',
    // se desejar, adicione 'registros'
    'registros',
  ]

  /**
   * setUser — recebe objeto parcial e aplica valores padrão
   * Recalcula derivados automaticamente via reatividade do Vue.
   * (fluxo existente mantido)
   */
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

    if (Array.isArray(u?.registros)) {
      registros.value = u.registros
    }

    // ao setar usuário, considere a sessão ativa
    onLine.value = true

    // persistência enxuta (mantida)
    const userToPersist = {}
    for (const k of PERSIST_KEYS) userToPersist[k] = (u && u[k]) ?? eval(k)?.value ?? null
    STORAGE.set(AUTH_KEY, JSON.stringify({ user: userToPersist }))
  }

  /**
   * [ADD] updateUser — merge parcial (não reseta campos ausentes no patch)
   * - Só atualiza as chaves PRESENTES no objeto `patch` (incluindo null/false/0 válidos).
   * - NÃO altera `onLine` a menos que venha no patch.
   * - Persiste o snapshot atual após aplicar o patch.
   */
  function updateUser(patch = {}) {
    // helper: aplica somente se a chave existir em patch (permite setar null/false/0)
    const has = (k) => Object.prototype.hasOwnProperty.call(patch, k)

    if (has('id')) id.value = patch.id
    if (has('name')) name.value = patch.name
    if (has('email')) email.value = patch.email
    if (has('PerfilTipoId')) PerfilTipoId.value = patch.PerfilTipoId
    if (has('avatarUrl')) avatarUrl.value = patch.avatarUrl
    if (has('escalaId')) escalaId.value = patch.escalaId
    if (has('tipoContratoId')) tipoContratoId.value = patch.tipoContratoId
    if (has('ativo')) ativo.value = patch.ativo
    if (has('themeColor')) themeColor.value = patch.themeColor
    if (has('onLine')) onLine.value = patch.onLine

    if (has('registros')) {
      registros.value = Array.isArray(patch.registros) ? patch.registros : []
    }

    // persiste o snapshot atual (após patch)
    const userToPersist = {}
    for (const k of PERSIST_KEYS) userToPersist[k] = eval(k)?.value ?? null
    STORAGE.set(AUTH_KEY, JSON.stringify({ user: userToPersist }))
  }

  // [UPDATE] Objeto encapsulado do usuário (get/set)
  // - GET: snapshot reativo de todos os atributos
  // - SET: agora usa MERGE parcial por padrão (updateUser)
  const user = computed({
    get: () => ({
      id: id.value,
      name: name.value,
      email: email.value,
      PerfilTipoId: PerfilTipoId.value,
      avatarUrl: avatarUrl.value,
      escalaId: escalaId.value,
      tipoContratoId: tipoContratoId.value,
      ativo: ativo.value,
      themeColor: themeColor.value,
      onLine: onLine.value,
      registros: registros.value,
    }),
    set: (patch) => {
      updateUser(patch)
    },
  })

  /* Utilização */
  // const store = useUserStore()
  // store.user = { name: 'Novo Nome' } // merge parcial (não reseta o resto)
  // // ou, explicitamente:
  // store.updateUser({ themeColor: 'dark', onLine: true })
  // // e para substituição completa (fluxo atual):
  // store.setUser(payloadCompleto)

  // util para trocar registros sem mexer no restante do usuário
  function setRegistros(list) {
    registros.value = Array.isArray(list) ? list : []
  }

  // limpa estado e storage
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
    registros.value = []
    STORAGE.remove(AUTH_KEY)

    logout() // redireciona p/ login
  }

  // alias sem mudar nomenclaturas/fluxos existentes
  function logout() {
    onLine.value = false
  }

  /* Gestor */
  async function fetchTeamByManager(managerId) {
    return await http.get('/users', { search: { managerId, _sort: 'name', _order: 'asc' } })
  }

  // aceita managerId opcional sem quebrar chamadas antigas
  async function reloadTeam(managerIdOverride) {
    loading.value = true
    error.value = ''
    try {
      const managerId = managerIdOverride ?? id.value // compat
      const resp = await fetchTeamByManager(managerId)
      const arr = Array.isArray(resp) ? resp : Array.isArray(resp?.data) ? resp.data : []
      team.value = arr
    } catch (e) {
      error.value = e?.message || 'Não foi possível carregar a equipe.'
    } finally {
      loading.value = false
    }
  }

  /**
   * ensureHydratedById — garante que o store reflita o usuário `targetId`.
   * 1) Se já está carregado e o id bate, não faz nada.
   * 2) Tenta restaurar do localStorage se o snapshot salvo tiver o mesmo id.
   * 3) Caso contrário, busca na API e persiste via setUser.
   */
  async function ensureHydratedById(uid) {
    const wanted = Number(uid)
    if (!Number.isFinite(wanted)) return
    // tenta do storage primeiro
    bootstrap()
    if (id.value === wanted) return

    try {
      const mod = await import('@/services/api')
      const getUserById = mod.getUserById
      const http = mod.http
      const resp = getUserById ? await getUserById(wanted) : await http.get(`/users/${wanted}`)
      const u = Array.isArray(resp?.data) ? resp.data[0] : (resp?.data ?? resp) || null
      if (u) setUser(u)
    } catch (e) {
      console.warn('ensureHydratedById failed:', e)
    }
  }  
  // async function ensureHydratedById(targetId) {
  //   const idNum = Number(targetId)
  //   if (!Number.isFinite(idNum)) return

  //   // 1) Já está hidratado com o mesmo user?
  //   if (id.value === idNum && id.value != null) return

  //   // 2) Tenta bater com o snapshot do localStorage
  //   try {
  //     const raw = STORAGE.get(AUTH_KEY)
  //     if (raw) {
  //       const parsed = JSON.parse(raw)
  //       const cached = parsed?.user
  //       if (cached && Number(cached.id) === idNum) {
  //         setUser(cached)
  //         return
  //       }
  //     }
  //   } catch (e) {
  //     console.warn('LocalStorage - Falha ao hidratar usuário por ID:', e)
  //   }

  //   // 3) Fallback: busca na API
  //   try {
  //     const mod = await import('@/services/api')
  //     const getUserById = mod.getUserById
  //     const resp = getUserById ? await getUserById(idNum) : await mod.http.get(`/users/${idNum}`)
  //     const u = Array.isArray(resp?.data) ? resp.data[0] : (resp?.data ?? resp) || null
  //     if (u) setUser(u)
  //   } catch (e) {
  //     console.warn('API - Falha ao hidratar usuário por ID:', e)
  //   }
  // }

  /**
   * bootstrap — restaura do storage somente se ainda não há sessão
   */
  function bootstrap() {
    if (id.value != null) return
    const raw = STORAGE.get(AUTH_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (!parsed?.user) return
      setUser(parsed.user) // se 'registros' estiverem persistidos, também serão aplicados
    } catch {
      // ignora parse inválido
    }
  }

  return {
    loading,
    error,

    /* User (refs individuais mantidos) */
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
    onLine,

    // [ADD] Objeto encapsulado do usuário + merge parcial
    user,
    updateUser,
    ensureHydratedById,

    registros, // exportado p/ depurar/atualizar
    registrosSemanal,
    registrosMensal,
    registrosAnual,

    /* Gestor */
    team,
    reloadTeam,

    setUser, // substituição completa (comportamento existente)
    setRegistros,
    clear,
    logout,
    bootstrap,
  }
})
