import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const chunkGroups = [
  {
    name: 'react-vendor',
    matches: ['/node_modules/react/', '/node_modules/react-dom/', '/node_modules/scheduler/'],
  },
  {
    name: 'framer-motion',
    matches: ['/node_modules/framer-motion/'],
  },
  {
    name: 'radix-ui',
    matches: ['/node_modules/@radix-ui/'],
  },
  {
    name: 'ui-components',
    matches: [
      '/node_modules/class-variance-authority/',
      '/node_modules/clsx/',
      '/node_modules/tailwind-merge/',
      '/node_modules/tailwindcss-animate/',
    ],
  },
  {
    name: 'validation',
    matches: ['/node_modules/ajv/', '/node_modules/ajv-formats/', '/node_modules/zod/'],
  },
  {
    name: 'math',
    matches: ['/node_modules/katex/', '/node_modules/react-katex/'],
  },
  {
    name: 'forms',
    matches: ['/node_modules/react-hook-form/'],
  },
  {
    name: 'icons',
    matches: ['/node_modules/lucide-react/'],
  },
] as const

export default defineConfig({
  plugins: [react()],
  base: './',
  esbuild: {
    // Optimize for production builds
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: true,
    // Target modern browsers for better optimization
    target: 'es2020',
    // Keep names for better debugging in development
    keepNames: process.env.NODE_ENV !== 'production',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Use esbuild for faster minification
    minify: 'esbuild',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')
          const group = chunkGroups.find(({ matches }) =>
            matches.some((match) => normalizedId.includes(match)),
          )

          return group?.name
        },
      }
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: 'localhost',
    cors: true,
    strictPort: false, // Try different ports if 3000 is in use
  },
})
