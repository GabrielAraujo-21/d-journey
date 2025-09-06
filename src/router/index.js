import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Usuario from '@/layout/Usuario.vue'
import Admin from '@/layout/Admin.vue'
import DJourneyTimeTracker from '@/components/DJourneyTimeTracker.vue'
import HistoricoMensal from '@/components/HistoricoMensal.vue'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login,
  },
  {
    path: '/user/:id', // localhost:5173/user/1
    name: 'usuario',
    component: Usuario,
    children: [
      { path: '', name: 'djourney', component: DJourneyTimeTracker }, // localhost:5173/user
      {
        path: 'historico-mensal',
        name: 'historico-mensal',
        component: HistoricoMensal,
        props: () => ({
          apiBase: import.meta.env.VITE_API_BASE || 'http://localhost:3000',
          userId: 1,
          order: 'desc',
        }),
      }, // localhost:5173/user/historico-mensal
    ],
  },
  {
    path: '/admin/:id', // localhost:5173/admin/2
    name: 'Admins',
    component: Admin,
  },
  {
    path: '/:catchAll(.*)*',
    // redirect: '/home', // Pode redirecionar ou apresentar um componente
    component: () => import('@/components/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
})

export default router
