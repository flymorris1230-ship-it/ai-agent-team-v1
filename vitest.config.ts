import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.wrangler/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/main/js'),
      '@core': path.resolve(__dirname, './src/main/js/core'),
      '@agents': path.resolve(__dirname, './src/main/js/agents'),
      '@api': path.resolve(__dirname, './src/main/js/api'),
      '@utils': path.resolve(__dirname, './src/main/js/utils'),
      '@types': path.resolve(__dirname, './src/main/js/types'),
    },
  },
});
