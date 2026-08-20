export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // цвета только через токены: хардкод #RRGGBB в модулях запрещён (docs/CLAUDE.md)
    'color-no-hex': true,
    'declaration-no-important': true,
    'max-nesting-depth': 2,
    'selector-max-id': 0,
    'custom-property-pattern': null,
    // токены сгруппированы пустыми строками по смыслу — это читаемость, а не мусор
    'custom-property-empty-line-before': null,
    'selector-class-pattern': '^[a-z][a-zA-Z0-9]+$',
  },
  ignoreFiles: ['**/node_modules/**', '**/.next/**', '**/storybook-static/**'],
  overrides: [
    {
      // единственное место, где хекс разрешён — определение самих токенов
      files: ['apps/*/src/shared/styles/tokens.css'],
      rules: { 'color-no-hex': null },
    },
  ],
};
