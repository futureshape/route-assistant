import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'playwright-report',
      'test-results',
      'admin-cli.js',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Downgrade to warn: calling setState inside useEffect to sync derived state
      // is a valid (if not always optimal) React pattern—existing code uses it widely.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
);
