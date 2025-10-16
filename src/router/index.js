import { createRouter, createWebHistory } from 'vue-router'
import BulletinBubbles from '@/components/BulletinBubbles.vue'

const routes = [
  { path: '/', name: 'Huddle', component: BulletinBubbles },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
