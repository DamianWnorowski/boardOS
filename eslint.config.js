import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'scripts/gemini-smart-start.js', 'scripts/setup-claude.js', 'src/components/modals/JobRowConfigModal.tsx', 'src/components/ui/QuickSelectOverlay.tsx'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        }
      ],
    },
  },
  // New configuration for .js files
  {
    files: ['**/*.js'], // Target all .js files
    languageOptions: {
      ecmaVersion: 'latest', // Use the latest ECMAScript version
      sourceType: 'module', // Assuming these are ES modules
      globals: {
        ...globals.node, // Assuming these are Node.js scripts
        ...globals.browser, // If some .js files are for browser
      },
    },
    rules: {
      // Add any specific rules for .js files here if needed
    },
  }
);