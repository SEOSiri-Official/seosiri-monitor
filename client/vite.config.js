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
      // No 'base' property needed for local dev
    }
  } else {
    // Production configuration
    return {
      plugins: [react()],
      base: '/seosiri-monitor/', // The base path for GitHub Pages
    }
  }
})