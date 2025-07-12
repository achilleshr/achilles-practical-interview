import eslintJs from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import * as importPlugin from 'eslint-plugin-import'
import perfectionist from 'eslint-plugin-perfectionist'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      'dist/**',
      '.github/**',
      '.vscode/**',
      'coverage/**',
      'node_modules/**',
      '**/*.d.ts',
      '**/*.tsx',
      'eslint.config.mjs',
    ],
  },
  {
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: {
      'import/resolver': {
        node: {
          paths: ['.'],
          extensions: ['.js', '.ts', '.mjs'],
        },
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },
  eslintConfigPrettier,
  eslintJs.configs.recommended,
  ...tseslint.configs.recommended,
  importPlugin?.flatConfigs?.recommended,
  {
    files: ['**/*.{ts,js,mjs}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'unused-imports': unusedImports,
      perfectionist: perfectionist,
    },
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'classMethod', format: ['camelCase'] },
        { selector: 'interface', format: ['PascalCase'] },
        { selector: 'variable', modifiers: ['destructured'], format: null },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      semi: ['error', 'never', { beforeStatementContinuationChars: 'always' }],
      'import/named': 'off',
      'import/no-unresolved': 'error',
      'sort-imports': 'off',
      'import/order': 'off',
      'import/sort': 'off',
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
          ignoreCase: true,
          specialCharacters: 'keep',
          internalPattern: ['^src/.+'],
          newlinesBetween: 'always',
          maxLineLength: undefined,
          environment: 'node',
          groups: [
            'type',
            ['builtin', 'external'],
            'internal-type',
            ['internal'],
            ['parent-type', 'sibling-type', 'index-type'],
            ['parent', 'sibling', 'index'],
            'object',
            'unknown',
          ],
        },
      ],
    },
  },
]
