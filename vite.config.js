import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Konfigurace Workbox pro cachování
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'], // Cesty k souborům k cachování
        cleanupOutdatedCaches: true,
        sourcemap: true,
      },
      manifest: {
        // Manifest pro PWA (přebíráme z našeho předchozího manifest.json)
        name: "Chytré já",
        short_name: "Chytré já",
        description: "Platforma pro AI agenty od Smart Solutions",
        start_url: "/", // Vite často preferuje "/" pro kořenovou cestu
        display: "standalone",
        background_color: "#f0f0f0",
        theme_color: "#2563eb",
        icons: [
          {
            src: "/images/avatarka_bile_pozadi_192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/images/avatarka_bile_pozadi_512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/images/maskable_icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      // Přidání CSS pro Tailwind CDN (pro vývoj i build)
      // Toto zajistí, že se Tailwind načte ve Vite projektu
      injectRegister: 'auto', // Automaticky vloží registraci service workeru
      devOptions: {
        enabled: true // Povolí PWA ve vývojovém režimu (pro testování offline)
      }
    })
  ],
  // Ujistěte se, že base je nastaveno správně pro deployment
  base: '/'
})
