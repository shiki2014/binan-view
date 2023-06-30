import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/views/home'
import errorLog from '@/views/LogView/errorLog'
import appLog from '@/views/LogView/appLog'
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
      path: '/errorLog',
      name: 'errorLog',
      component: errorLog
    },
    {
      path: '/appLog',
      name: 'appLog',
      component: appLog
    }
  ]
})
