import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/LoginComponent.vue'
import UsuarioLayout from '@/layout/UsuarioLayout.vue'
import GestorLayout from '@/layout/GestorLayout.vue'
import DJourneyTimeTracker from '@/components/usuario/DJourneyTimeTracker.vue'
import HistoricoMensal from '@/components/usuario/HistoricoMensal.vue'
import { useUserStore } from '@/stores/user'
import { patchUser } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

const APP_TITLE = 'd-journey'
function pickUserLabel(u) {
  return u?.name || u?.nome || u?.fullName || u?.email || null
}
function resolveRouteTitle(to) {
  for (let i = to.matched.length - 1; i >= 0; i--) {
    const rec = to.matched[i]
    const t = rec?.meta?.title
    if (!t) continue
    return typeof t === 'function' ? t(to) : t
  }
  return null
}

const routes = [
  { path: '/', name: 'Login', component: Login, meta: { title: 'Entrar' } },

  {
    path: '/user/:id',
    name: 'usuario',
    component: UsuarioLayout,
    meta: { requiresAuth: true, title: (to) => `Área do Usuário • ID ${to.params.id}` },
    props: (route) => ({ apiBase, userId: Number(route.params.id), order: 'desc' }),
    children: [
      {
        path: '',
        name: 'djourney',
        component: DJourneyTimeTracker,
        meta: { title: 'Check-Point Diário' },
        props: (route) => ({ apiBase, userId: Number(route.params.id) }),
      },
      {
        path: 'historico-mensal',
        name: 'historico-mensal',
        component: HistoricoMensal,
        meta: { title: 'Histórico Mensal' },
        props: (route) => ({ apiBase, userId: Number(route.params.id), order: 'desc' }),
      },
    ],
  },

  {
    path: '/admin/:id',
    name: 'gestor',
    component: GestorLayout,
    meta: { requiresAuth: true, title: (to) => `Painel do Gestor • ID ${to.params.id}` },
    children: [
      // Equipe (lista + tracker vazio)
      {
        path: '',
        name: 'djourney-gestor',
        component: DJourneyTimeTracker,
        meta: {
          title: 'Equipe',
          breadcrumb: (to) => [
            { title: 'Gestor', disabled: true },
            { title: 'Equipe', to: { name: 'djourney-gestor', params: { id: to.params.id } } },
          ],
        },
        props: { apiBase, userId: null },
      },

      // Usuário selecionado pelo gestor (a partir da lista)
      {
        path: 'usuario/:userId',
        name: 'djourney-gestor-usuario',
        component: DJourneyTimeTracker,
        meta: {
          title: (to) => {
            const u = to.meta?.selectedUser
            const who = pickUserLabel(u) || `ID ${to.params.userId}`
            return `Check-Point Diário • ${who}`
          },
          breadcrumb: (to) => {
            const u = to.meta?.selectedUser
            return [
              { title: 'Gestor', disabled: true },
              { title: 'Equipe', to: { name: 'djourney-gestor', params: { id: to.params.id } } },
              { title: pickUserLabel(u) || `ID ${to.params.userId}`, disabled: true },
            ]
          },
        },
        props: (route) => ({
          apiBase,
          userId: Number(route.params.userId),
          selectedUser: route.meta?.selectedUser ?? null,
        }),
        beforeEnter: async (to) => {
          const userId = Number(to.params.userId)
          if (!Number.isFinite(userId)) {
            to.meta.selectedUser = null
            return true
          }
          try {
            const mod = await import('@/services/api')
            const getUserById = mod.getUserById
            const http = mod.http
            const resp = getUserById
              ? await getUserById(userId)
              : await http.get(`/users/${userId}`)
            const u = Array.isArray(resp?.data) ? resp.data[0] : (resp?.data ?? resp) || null
            to.meta.selectedUser = u || null
          } catch (e) {
            console.warn('Falha ao buscar usuário selecionado:', e)
            to.meta.selectedUser = null
          }
          return true
        },
      },

      // Minha jornada (sub-abas)
      {
        path: 'minha',
        redirect: (to) => ({ name: 'gestor-minha-diario', params: { id: to.params.id } }),
      },
      {
        path: 'minha/diario',
        name: 'gestor-minha-diario',
        component: DJourneyTimeTracker,
        meta: {
          title: 'Minha jornada • Diário',
          breadcrumb: (to) => [
            { title: 'Gestor', disabled: true },
            {
              title: 'Minha jornada',
              to: { name: 'gestor-minha-diario', params: { id: to.params.id } },
            },
            { title: 'Diário', disabled: true },
          ],
        },
        // Aqui usamos o próprio :id do gestor como userId alvo
        props: (route) => ({ apiBase, userId: Number(route.params.id) }),
      },
      {
        path: 'minha/mensal',
        name: 'gestor-minha-mensal',
        component: HistoricoMensal,
        meta: {
          title: 'Minha jornada • Mensal',
          breadcrumb: (to) => [
            { title: 'Gestor', disabled: true },
            {
              title: 'Minha jornada',
              to: { name: 'gestor-minha-diario', params: { id: to.params.id } },
            },
            { title: 'Mensal', disabled: true },
          ],
        },
        props: (route) => ({ apiBase, userId: Number(route.params.id), order: 'desc' }),
      },
    ],
  },

  // logout mantido
  {
    path: '/logout',
    name: 'logout',
    meta: { title: 'Saindo…' },
    beforeEnter: async () => {
      const auth = useAuthStore()
      if (auth.accountId) {
        try {
          await patchUser(auth.accountId, { onLine: false })
        } catch (e) {
          console.warn('Falha ao marcar conta como offline', e)
        }
      }
      await auth.signOut({ notifyServer: false })

      const userStore = useUserStore()
      userStore.clear()
      return { name: 'Login' }
    },
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: 'Página não encontrada' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.bootstrap()

  if (to.meta?.requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // Quem não é gestor não entra em /admin
  if (to.name?.toString().startsWith('gestor') && auth.account?.PerfilTipoId !== 3) {
    return { name: 'usuario', params: { id: auth.accountId } }
  }

  // Usuário comum só pode acessar sua própria área /user/:id
  if (to.name === 'usuario') {
    const targetId = Number(to.params.id)
    if (auth.account?.PerfilTipoId === 4 && auth.accountId !== targetId) {
      return { name: 'usuario', params: { id: auth.accountId } }
    }
  }

  console.log('navegar para', to)
})

router.afterEach((to) => {
  const t = resolveRouteTitle(to)
  document.title = t ?? APP_TITLE
})

export default router
