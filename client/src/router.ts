import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './stores/auth'
import { isTechRole, isManagerRole } from './utils'

import Login     from './pages/Login.vue'
import Layout    from './components/Layout.vue'
import MyDevices from './pages/tech/MyDevices.vue'
import Issues    from './pages/tech/Issues.vue'
import History   from './pages/tech/History.vue'
import Monthly   from './pages/tech/Monthly.vue'
import Overview  from './pages/manager/Overview.vue'
import Sites     from './pages/manager/Sites.vue'
import Devices   from './pages/manager/Devices.vue'
import MTickets  from './pages/manager/Tickets.vue'
import MReports  from './pages/manager/Reports.vue'
import Dashboard from './pages/director/Dashboard.vue'
import DTickets  from './pages/director/Tickets.vue'
import Accounts  from './pages/admin/Accounts.vue'

function firstTab(role: string) {
  if (isTechRole(role))    return '/app/my-devices'
  if (isManagerRole(role)) return '/app/overview'
  if (role === 'director') return '/app/dashboard'
  return '/app/accounts'
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    {
      path: '/app',
      component: Layout,
      children: [
        { path: 'my-devices', component: MyDevices },
        { path: 'issues',     component: Issues },
        { path: 'history',    component: History },
        { path: 'monthly',    component: Monthly },
        { path: 'overview',   component: Overview },
        { path: 'sites',      component: Sites },
        { path: 'mdevices',   component: Devices },
        { path: 'mtickets',   component: MTickets },
        { path: 'mreports',   component: MReports },
        { path: 'dashboard',  component: Dashboard },
        { path: 'dtickets',   component: DTickets },
        { path: 'accounts',   component: Accounts },
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ]
})

router.beforeEach((to) => {
  const auth = useAuth()
  if (to.path === '/login') {
    return auth.user ? firstTab(auth.user.role) : true
  }
  if (!auth.user) return '/login'
  if (to.path === '/app' || to.path === '/app/') return firstTab(auth.user.role)
  return true
})

export default router
