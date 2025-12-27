import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.js'],
        env: {
            NODE_ENV: 'test'
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.js'],
            exclude: ['src/**/*.test.js', '**/node_modules/**']
        },
        testTimeout: 30000,
        hookTimeout: 30000,
        setupFiles: ['./tests/helpers/setup.js'],
        pool: 'forks', // Run tests sequentially
        poolOptions: {
            forks: {
                singleFork: true
            }
        }
    }
});
