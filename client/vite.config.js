import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  // `command` will be 'serve' for local development (`npm run dev`)
  // `command` will be 'build' for production (`npm run build`)
  
  if (command === 'serve') {
    // Development configuration
    return {
      plugins: [react()],
      // No 'base' property needed for local dev, this is correct.
    }
  } else {
    // Production configuration
    return {
      plugins: [react()],
      // --- THIS IS THE FIX ---
      // 'base' is no longer needed because you are using a custom domain.
      // Remove this line entirely:
      // base: '/seosiri-monitor/', 
    }
  }
})