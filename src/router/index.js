import Vue from 'vue'
import Router from 'vue-router'
import errorLog from '@/views/LogView/errorLog'
import appLog from '@/views/LogView/appLog'
import control from '@/views/control'
Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'control',
      component: control
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
    },
    {
      path: '/control',
      redirect: '/'
    }
  ]
})
