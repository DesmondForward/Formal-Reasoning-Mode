import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'framer-motion': ['framer-motion'],
          'radix-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-icons',
            '@radix-ui/react-label',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          'ui-components': [
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
            'tailwindcss-animate'
          ],
          'validation': ['ajv', 'ajv-formats', 'zod'],
          'math': ['katex', 'react-katex'],
          'forms': ['react-hook-form'],
          'icons': ['lucide-react'],
          // App chunks
          'editors': [
            './src/components/editors/MetadataEditor',
            './src/components/editors/InputEditor',
            './src/components/editors/ModelingEditor',
            './src/components/editors/MethodSelectionEditor',
            './src/components/editors/SolutionAnalysisEditor',
            './src/components/editors/ValidationEditor',
            './src/components/editors/OutputContractEditor'
          ],
          'panels': [
            './src/components/ValidationPanel',
            './src/components/VisualizationPanel'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
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
