module.exports = {
  plugins: ['prettier', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:prettier/recommended',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      node: true,
      typescript: true,
    },
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'import/order': 'error',
    '@typescript-eslint/ban-ts-comment': 'off',
    radix: 'off',
  },
  ignorePatterns: ['node_modules', 'dist', 'build'],
  root: true,
}
