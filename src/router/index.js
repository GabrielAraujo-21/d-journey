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

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login,
  },

  {
    path: '/user/:id',
    name: 'usuario',
    component: UsuarioLayout,
    meta: { requiresAuth: true },
    props: (route) => ({
      apiBase,
      userId: Number(route.params.id),
      order: 'desc',
    }),
    children: [
      {
        path: '',
        name: 'djourney',
        component: DJourneyTimeTracker,
        props: (route) => ({
          apiBase,
          userId: Number(route.params.id),
        }),
      },
      {
        path: 'historico-mensal',
        name: 'historico-mensal',
        component: HistoricoMensal,
        props: (route) => ({
          apiBase,
          userId: Number(route.params.id),
          order: 'desc',
        }),
      },
    ],
  },

  {
    path: '/admin/:id',
    name: 'gestor',
    component: GestorLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'djourney-gestor',
        component: DJourneyTimeTracker,
        props: {
          apiBase,
          userId: null,
        },
      },

      // [ADD] Guard per-route: busca o usuário selecionado e injeta como props
      {
        path: 'usuario/:userId',
        name: 'djourney-gestor-usuario',
        component: DJourneyTimeTracker,
        // props inclui o userId e o objeto resolvido na guard (via meta)
        props: (route) => ({
          apiBase,
          userId: Number(route.params.userId),
          selectedUser: route.meta?.selectedUser ?? null, // << aqui vai o payload buscado
        }),
        // Guard executa antes de entrar na rota:
        beforeEnter: async (to) => {
          const userId = Number(to.params.userId)
          if (!Number.isFinite(userId)) {
            // userId inválido — deixa seguir sem bloquear, mas sem selectedUser
            to.meta.selectedUser = null
            return true
          }
          try {
            // import dinâmico evita ciclos e só carrega quando necessário
            const mod = await import('@/services/api')
            // se houver getUserById, usa; caso contrário, fallback p/ http
            const getUserById = mod.getUserById
            const http = mod.http

            const resp = getUserById
              ? await getUserById(userId)
              : await http.get(`/users/${userId}`)

            // normaliza (resp, resp.data ou array)
            const u = Array.isArray(resp?.data) ? resp.data[0] : (resp?.data ?? resp) || null

            to.meta.selectedUser = u || null
          } catch (e) {
            console.warn('Falha ao buscar usuário selecionado:', e)
            to.meta.selectedUser = null
          }
          return true // permite a navegação
        },
      },
    ],
  },

  // logout mantido
  {
    path: '/logout',
    name: 'logout',
    beforeEnter: async () => {
      const auth = useAuthStore()

      // atualiza status online da conta logada (se houver)
      if (auth.accountId) {
        try {
          await patchUser(auth.accountId, { onLine: false })
        } catch (e) {
          console.warn('Falha ao marcar conta como offline', e)
        }
      }

      // encerra sessão (limpa tokens + account no authStore)
      await auth.signOut({ notifyServer: false })

      // “resetar” o contexto analisado:
      const userStore = useUserStore()
      userStore.clear()

      return { name: 'Login' }
    },
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('@/views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Guard global de auth (mantido)
router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.bootstrap()

  if (to.meta?.requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
})

export default router
