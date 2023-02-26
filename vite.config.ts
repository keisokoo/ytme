import react from '@vitejs/plugin-react'
import path, { resolve } from 'path'
import { defineConfig } from 'vite'

const root = resolve(__dirname, 'src')
const pagesDir = resolve(root, 'pages')
const assetsDir = resolve(root, 'assets')
const outDir = resolve(__dirname, 'dist')
const publicDir = resolve(__dirname, 'public')

const isDev = process.env.__DEV__ === 'true'
const isProduction = !isDev

// ENABLE HMR IN BACKGROUND SCRIPT
const enableHmrInBackgroundScript = true

export default defineConfig({
  resolve: {
    alias: {
      '@src': root,
      '@assets': assetsDir,
      '@pages': pagesDir,
    },
  },
  plugins: [react()],
  publicDir,
  build: {
    outDir,
    /** Can slowDown build speed. */
    // sourcemap: isDev,
    minify: isProduction,
    reportCompressedSize: isProduction,
    rollupOptions: {
      input: {
        content: resolve(pagesDir, 'content', 'index.ts'),
        background: resolve(pagesDir, 'background', 'index.ts'),
        contentStyle: resolve(pagesDir, 'content', 'style.scss'),
        options: resolve(pagesDir, 'options', 'index.html'),
      },
      watch: {
        include: ['src/**', 'vite.config.ts'],
        exclude: ['node_modules/**', 'src/**/*.spec.ts'],
      },
      output: {
        entryFileNames: 'src/pages/[name]/index.js',
        chunkFileNames: isDev
          ? 'assets/js/[name].js'
          : 'assets/js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const { dir, name: _name } = path.parse(assetInfo.name)
          const assetFolder = dir.split('/').at(-1)
          const name = assetFolder + firstUpperCase(_name)
          return `assets/[ext]/${name}.chunk.[ext]`
        },
      },
    },
  },
})

function firstUpperCase(str: string) {
  const firstAlphabet = new RegExp(/( |^)[a-z]/, 'g')
  return str.toLowerCase().replace(firstAlphabet, (L) => L.toUpperCase())
}