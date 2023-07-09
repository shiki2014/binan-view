// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import ElementUI from 'element-ui'
import './assets/css/main.css'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI)

Vue.config.productionTip = false

/* eslint-disable no-new */

new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
// にゃにゃめ   にゃにゃじゅう  にゃにゃどの   にゃらびで   にゃくにゃく いにゃにゃく  にゃにゃはん  にゃにゃだい  にゃんにゃくにゃらべて  にゃがにゃがめ
