import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  define: {
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  plugins: [uni()]
})
