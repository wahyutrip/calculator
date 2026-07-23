import config from '@mm/eslint-config';

export default [
  ...config,
  {
    ignores: ['.next/**', 'next-env.d.ts', 'e2e/**', 'scripts/**', 'public/sw.js'],
  },
];
