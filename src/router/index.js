import { createRouter, createWebHistory } from 'vue-router'
import HomeBoard  from '../components/HomeBoard.vue'
import PrivateBoard from '../components/PrivateBoard.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home-board',
      component: HomeBoard
    },
  ],
})

export default router
