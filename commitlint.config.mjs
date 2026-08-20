// Conventional Commits, области — по разделам проекта (docs/CLAUDE.md, раздел «Коммиты»)
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['site', 'catalog', 'admin', 'seo', 'api', 'notify', 'db', 'ui', 'infra', 'docs', 'readme', 'process', 'design', 'deps'],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};
