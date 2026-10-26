import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { copeApiPlugin } from './vite-plugin-api';

const SERVER_ENV_KEYS = [
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_MODEL',
  'OPENAI_TOKEN_PARAM',
  'OPENAI_JSON_MODE',
  'OPENAI_VISION',
  'COPE_DEMO',
  'COPE_DEMO_DELAY_MS',
  'COPE_RATE_LIMIT_PER_MINUTE',
] as const;

export default defineConfig(({ mode }) => {
  // El proxy lee process.env; Vite solo carga .env en import.meta.env.
  const fileEnv = loadEnv(mode, process.cwd(), '');
  for (const key of SERVER_ENV_KEYS) {
    const value = fileEnv[key];
    if (value !== undefined && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [
      react(),
      copeApiPlugin(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['theme-init.js', 'logo.svg'],
        manifest: {
          name: 'Cope AI',
          short_name: 'Cope',
          description:
            'Tutor de estudio y asistente AI para aprender, practicar y resolver dudas.',
          lang: 'es',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#F6F1E7',
          theme_color: '#17150F',
          categories: ['education', 'productivity'],
          icons: [
            {
              src: '/icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: [
            '**/*.{js,css,html,svg,png,ico,woff2,webmanifest,txt}',
          ],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    build: {
      target: 'es2022',
      modulePreload: { polyfill: false },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  };
});
