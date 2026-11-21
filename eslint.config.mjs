import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
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
      '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true }],
      'import/no-default-export': 'off',
    },
  },
]

export default config
