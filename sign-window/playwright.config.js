const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.js',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true
  },
  webServer: {
    command: 'node server/index.js',
    url: 'http://127.0.0.1:3000/demo/index.html',
    reuseExistingServer: true,
    timeout: 30000
  },
  projects: [{ name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } }]
})
