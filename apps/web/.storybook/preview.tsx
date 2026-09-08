import type { Preview } from '@storybook/nextjs-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/shared/styles/global.css';

/**
 * Раздел витрины, который показывает панель. Заголовок — единственный признак
 * раздела, доступный глобальному декоратору, и он же тот, по которому раздел
 * отбирают снепшоты и измерения.
 */
const PANEL_SECTION = 'Админка/';

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
    /* 🔴 Раздел «Админка» идёт внутри контейнера панели (issue #867).
       Плотность, радиусы, заливка поля и тени панели объявлены на
       `[data-ui='panel']` и на `body:has([data-ui='panel'])` — на живой
       странице атрибут ставит `NavState`, а на витрине не ставил никто, и
       105 историй из 111 показывали геометрию витрины: кнопка радиусом 9
       вместо пилюли, с тенью, которой в панели нет, и высотой 44 там, где на
       странице 32 (замер по `админка-склад-·-разбивка--базовое`).

       Признак — заголовок, а не декоратор в каждом файле. Ста пяти копий
       одного и того же не бывает без пропусков: три недели держались шесть,
       и каждая заводилась своим issue, когда дефект уже дошёл до владельца.
       Разделы `UI Kit/` и `Кит/` сюда не попадают намеренно: половина их
       историй существует ровно затем, чтобы показать разницу витрины и
       панели, и общая обёртка стёрла бы её. */
    (Story, context) =>
      context.title.startsWith(PANEL_SECTION) ? (
        <div data-ui="panel">
          <Story />
        </div>
      ) : (
        <Story />
      ),
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
};

export default preview;
