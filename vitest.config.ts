import { defineConfig } from 'vitest/config'
import { JUnitReporter } from 'vitest/reporters'

export default defineConfig(() => {
  const reporters: any[] = ['dot']

  if (process.env.CI) {
    reporters.push(
      new JUnitReporter({
        outputFile: 'junit.xml',
        suiteName: 'vitest',
        useFullName: true,
      })
    )
  }

  return {
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      reporters,
    },
  }
})
