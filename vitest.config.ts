import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: path.resolve(__dirname, './vitest.setup.ts'),
    // Add test file patterns
    include: ['**/*.test.ts', '**/*.test.tsx'],
    alias: {
      // '@/services': path.resolve(__dirname, './services'),
    },
  },
});
