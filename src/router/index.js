import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Usuario from '@/layout/Usuario.vue'
import Admin from '@/layout/Gestor.vue'
import DJourneyTimeTracker from '@/components/usuario/DJourneyTimeTracker.vue'
import HistoricoMensal from '@/components/usuario/HistoricoMensal.vue'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login,
  },

  {
    path: '/user/:id',
    name: 'usuario',
    component: Usuario,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'djourney', component: DJourneyTimeTracker },
      {
        path: 'historico-mensal',
        name: 'historico-mensal',
        component: HistoricoMensal,
        props: (route) => ({
          apiBase: (import.meta.env.VITE_API_URL || '').replace(/\/+$/, ''), // remove / final
          userId: Number(route.params.id),
          order: 'desc',
        }),
      },
    ],
  },

  {
    path: '/admin/:id',
    name: 'Admins',
    component: Admin,
    meta: { requiresAuth: true },
  },

  // rota dedicada para logout
  {
    path: '/logout',
    name: 'logout',
    beforeEnter: () => {
      const store = useUserStore()
      store.logout() // limpa store + localStorage
      return { name: 'Login' } // volta pro login
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

// Guard: reidrata e protege rotas autenticadas
router.beforeEach((to) => {
  const store = useUserStore()
  if (!store.isLoggedIn) store.bootstrap()
  if (to.meta?.requiresAuth && !store.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
})

export default router
