import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for FFmpeg.js MKVE Testing
 * Tests WebAssembly worker functionality and large file audio extraction
 */

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 120000, // 2 minutes timeout for large file operations
  expect: {
    timeout: 30000 // 30 seconds for assertions
  },
  use: [
    {
      // Browser configuration for large file testing
      ...devices['Desktop Chrome'],
      viewport: { width: 1280, height: 720 },
      launchOptions: {
        args: [
          '--js-flags=--max-old-space-size=4096',
          '--enable-features=SharedArrayBuffer',
          '--enable-webassembly-simd',
          '--disable-web-security', // For local file testing
          '--allow-file-access-from-files', // For local file access
          '--disable-features=TranslateUI,BlinkGenPropertyTrees'
        ]
      }
    }
  ],
  webServer: {
    // Local server for testing worker files
    command: 'python -m http.server 8080',
    port: 8080,
    timeout: 120000, // 2 minutes
    reuseExistingServer: !process.env.CI
  },
  workers: process.env.CI ? 1 : 4, // Parallel workers
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/test-results.xml' }],
    console
  ],
  retries: 2, // Retry flaky tests
  fullyParallel: true, // Run tests in parallel
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
});