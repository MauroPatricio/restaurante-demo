import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5175, // Avoid conflict with admin (5173/5174)
        host: true,
        proxy: {
            '/api': {
                target: 'http://46.62.246.24:5000',
                changeOrigin: true,
                secure: false
            },
            '/socket.io': {
                target: 'http://46.62.246.24:5000',
                ws: true,
                changeOrigin: true,
                secure: false
            }
        }
    }
})
