import config from '@ctrl/eslint-config-biome';

export default [
  {
    ignores: ['coverage', 'dist'],
  },
  ...config,
];
