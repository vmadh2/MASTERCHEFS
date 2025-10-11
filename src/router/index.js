import { createRouter, createWebHistory } from 'vue-router'
import HomeBoard  from '../components/HomeBoard.vue'
import PrivateBoard from '../components/PrivateBoard.vue'
import FormSheet from '@/components/FormSheet.vue'
import TestPage from '@/components/TEST.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home-board',
      component: HomeBoard
    },
    {
      path: '/formsheet',
      name: 'form-sheet',
      component: FormSheet
    },
    {
      path: '/test',
      name: 'test',
      component: TestPage
    },
    { path: '/privateboard', 
      name: 'private-board', 
      component: PrivateBoard 
    },
  ],
})

export default router
