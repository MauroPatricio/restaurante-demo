import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'framer-motion', 'axios'],
                    i18n: ['react-i18next', 'i18next'],
                },
            },
        },
    },
    server: {
        port: 5175, // Avoid conflict with admin (5173/5174)
        host: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false
            },
            '/socket.io': {
                target: 'http://127.0.0.1:5000',
                ws: true,
                changeOrigin: true,
                secure: false
            }
        }
    }
})
