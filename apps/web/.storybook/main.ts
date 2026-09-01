import { basename } from 'node:path';

import type { StorybookConfig } from '@storybook/nextjs-vite';
import { mergeConfig } from 'vite';

/**
 * 🔴 Стабильные имена классов CSS Modules — только у витрины под измерения
 * (ADR-230, фаза 4, issue #459). Узел в снимке измерений опознаётся классом
 * `Компонент__элемент`, а не путём в DOM: путь ломается от любой обёртки, а
 * хеш в имени (`_title_q5ie7_13`) протухает от пересборки и не читается в
 * диффе. Включается переменной, чтобы ни дев-сервер, ни боевая сборка, ни
 * снимки пикселей не заметили разницы — им имена классов безразличны.
 *
 * `filename` у Vite приходит с суффиксом запроса (`?used`), его отрезаем.
 */
const stableScopedName = (name: string, filename: string): string =>
  `${basename(filename.split('?')[0] ?? filename).replace(/\.module\.css$/, '')}__${name}`;

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-themes'],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  staticDirs: ['../public'],
  viteFinal: (viteConfig) => {
    if (process.env.VR_STABLE_CLASSNAMES !== '1') return viteConfig;
    /* `mergeConfig`, а не подмена `css` целиком: фреймворк уже положил туда
       свои настройки, и терять их ради одного поля нельзя. */
    return mergeConfig(viteConfig, {
      css: { modules: { generateScopedName: stableScopedName } },
    });
  },
};

export default config;
