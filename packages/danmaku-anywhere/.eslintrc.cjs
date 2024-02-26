module.exports = {
  extends: ['../../.eslintrc.cjs'],
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        basePath: './src',
        zones: [
          {
            target: './popup',
            from: './background',
          },
          {
            target: './popup',
            from: './content',
          },
          {
            target: './content',
            from: './background',
          },
          {
            target: './content',
            from: './popup',
          },
          {
            target: './background',
            from: './popup',
          },
          {
            target: './background',
            from: './content',
          },
        ],
      },
    ],
  },
}
