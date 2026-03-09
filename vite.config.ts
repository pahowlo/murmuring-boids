import { defineConfig } from "vite"

export default defineConfig({
  // NO OUTDIR. We build with tsc.
  // Vite is only used to serve demo.html for displaying the component.
  server: {
    open: "/demo.html",
  },

  optimizeDeps: {
    entries: [
      'index.html',
      'src/**/*.{ts,tsx,js,jsx}',
      '!src/**/*.test.ts', // Explicitly ignore test files
    ],
  },
})
