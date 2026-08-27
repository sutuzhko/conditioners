import type { Preview } from '@storybook/nextjs-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/shared/styles/global.css';

const preview: Preview = {
  initialGlobals: { viewport: { value: 'lg' } },
  parameters: {
    viewport: {
      // те же ширины, что в снепшот-тестах (docs/DESIGN_BRIEF.md §6).
      // Storybook 9 читает options, а не viewports — в старом формате
      // пресеты не появлялись в панели.
      options: {
        xs: { name: '320 — минимум', styles: { width: '320px', height: '720px' } },
        sm: { name: '375 — телефон', styles: { width: '375px', height: '812px' } },
        md: { name: '768 — планшет', styles: { width: '768px', height: '1024px' } },
        lg: { name: '1200 — десктоп', styles: { width: '1200px', height: '900px' } },
      },
    },
    backgrounds: { disable: true },
    /* 🔴 Роутер App Router нужен всему, что зовёт `useRouter`: формы панели
       после сохранения освежают страницу. Без него история падает с
       «invariant expected app router to be mounted» — и падала бы у каждой
       такой истории по отдельности, если ставить параметр на месте. */
    nextjs: { appDirectory: true },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
};

export default preview;
