import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
      'legacy/**',
      '.next/**',
      '.next-cov/**',
      'coverage/**',
      '.coverage/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'import/no-default-export': 'off',
    },
  },
]

export default config
