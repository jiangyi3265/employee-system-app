import App from './App'
import { guardCurrentPage } from './utils/guard.js'

if (typeof window !== 'undefined') {
  window.__SQMS_BUILD_TIME__ = __APP_BUILD_TIME__
}

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.mixin({
	onShow() {
		guardCurrentPage()
	}
})
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  app.mixin({
    onShow() {
      guardCurrentPage()
    }
  })
  return {
    app
  }
}
// #endif
