import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing'

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    reporters: process.env.GITHUB_ACTIONS ? ['github-actions'] : ['default'],
    // exclude e2e tests from unit tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/tests/e2e/**',
      '**/tests/fixtures/**',
      '**/tests/playwright/**',
    ],
  },
})
