import { expect, test } from '@playwright/test';

import { loginViaUi } from './support/admin-ui';

/**
 * Панель не ездит вбок.
 *
 * 🔴 Проверка нужна именно измерением. Снимок кадрирован по окну и
 * горизонтальную прокрутку не показывает вовсе: страница календаря растягивала
 * документ до 413px при экране 375 — одной подписью «занято 1 ч 30 мин» в
 * колонке шириной сорок пять, — и ни один снимок этого не выдал (issue #281).
 *
 * Ширины взяты те, на которых панель открывают с телефона: на них колонки
 * недели самые узкие, а значит и ломается всё на них.
 *
 * 🔴 900 добавлена не для симметрии. Это граница набора порогов
 * (DESIGN_BRIEF §6), и на ней таблицы уже показываются таблицами, а места им
 * не хватает: колонка разделов забирает 257px, и каталог уезжал правым краем
 * на 997 при документе 900 (issue #302). Самая тесная ширина для таблицы —
 * не самая узкая, а первая, на которой карточки кончились.
 */
const WIDTHS = [320, 375, 900] as const;

const SECTIONS = [
  ['календарь · неделя', '/admin/crm?view=week&day=2026-08-19'],
  ['календарь · день', '/admin/crm?view=day&day=2026-08-19'],
  ['календарь · месяц', '/admin/crm?view=month&month=2026-08'],
  ['заявки', '/admin/leads'],
  ['заказы', '/admin/orders'],
  ['каталог', '/admin/catalog'],
] as const;

test.describe('раскладка панели', () => {
  for (const width of WIDTHS) {
    test(`🔴 на ${width}px ни один раздел не прокручивается по горизонтали`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await loginViaUi(page);

      for (const [name, path] of SECTIONS) {
        await page.goto(path);

        const size = await page.evaluate(() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));

        expect(size.scroll, `${name} на ${width}px`).toBe(size.client);
      }
    });
  }
});
