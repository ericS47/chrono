/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Chemins relatifs : fonctionne sur GitHub Pages (/chrono/) et en local.
import pkg from './package.json';

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // Date de la version, affichée dans les réglages pour vérifier qu'une mise à jour est arrivée.
    __APP_BUILD__: JSON.stringify(new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })),
  },
  plugins: [
    react(),
    VitePWA({
      // Mise à jour appliquée par main.tsx, jamais pendant une séance.
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Pulse',
        short_name: 'Pulse',
        description: 'Un peu Pulse chaque jour. Chrono de séance : AMRAP, EMOM, Tabata, intervalles, musculation, course.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F7F6F3',
        theme_color: '#F7F6F3',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,mp4,mp3}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
