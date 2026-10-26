import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'virtual:pwa-register': fileURLToPath(
        new URL('./src/test/pwa-register-mock.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      'server/**/*.test.ts',
      'shared/**/*.test.ts',
    ],
    restoreMocks: true,
    clearMocks: true,
  },
});
