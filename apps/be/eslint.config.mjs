import config from '@mm/eslint-config';

export default [
  ...config,
  {
    ignores: ['dist/**'],
  },
];
