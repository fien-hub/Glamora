module.exports = {
  root: true,
  extends: ['expo'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: { jest: true },
  ignorePatterns: ['node_modules', 'dist', 'build'],
};
