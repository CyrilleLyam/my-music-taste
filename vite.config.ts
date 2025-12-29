import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), UnoCSS()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const ext = path.extname(assetInfo.name ?? '').toLowerCase()
          const isAudioAsset = ext === '.mp3'

          // Keep audio file names ASCII-only in the build output to avoid hosting quirks.
          if (isAudioAsset)
            return 'assets/audio/[hash][extname]'

          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
