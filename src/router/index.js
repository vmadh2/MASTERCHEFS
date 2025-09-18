import { createRouter, createWebHistory } from 'vue-router'
import HomeBoard  from '../components/HomeBoard.vue'
import PrivateBoard from '../components/PrivateBoard.vue'
import FormSheet from '@/components/FormSheet.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'form-sheet',
      component: FormSheet
    },
  ],
})

export default router
