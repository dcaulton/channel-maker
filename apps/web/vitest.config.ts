import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['app/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.tsx'],
      exclude: ['app/**/*.test.tsx'],
    },
  },
});
