import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/views/home'
import LogView from '@/views/LogView'
Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/log',
      name: 'log',
      component: LogView
    }
  ]
})
