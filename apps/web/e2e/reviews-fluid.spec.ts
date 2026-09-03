import { expect, test } from '@playwright/test';

import { BASE_URL } from './support/admin-api';

/**
 * Отзывы после перевёрстки (issue #274, issue #275, issue #278).
 *
 * 🔴 Обрезка длинного отзыва — представление, а не правка (инвариант 7):
 * полный текст остаётся в HTML, читалка читает его целиком, поисковик
 * индексирует целиком. Здесь это и проверяется — на исходном коде страницы,
 * а не на том, что видно глазами.
 */

test.use({ baseURL: BASE_URL });

const WIDTHS = [320, 360, 375, 390, 414, 480, 540, 600, 768, 820, 900, 1024, 1200, 1440] as const;

test.describe('Отзывы: раскладки и обрезка', () => {
  /**
   * 🔴 Ни одна карточка не срезана краем и документ не едет вбок ни на одной
   * из четырнадцати проверяемых ширин. До 1200 карточки лежат колонкой и
   * сеткой; с 1200 лента уходит за край намеренно и гасит обрыв маской, но
   * документ шире окна не становится.
   */
  test('ни одна ширина не даёт горизонтальной прокрутки документа', async ({ page }) => {
    test.slow();
    await page.goto('/');
    await page.locator('#reviews').waitFor();

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        window: window.innerWidth,
      }));
      expect(overflow.scroll, `ширина ${width}: документ шире окна`).toBe(overflow.window);
    }
  });

  test('до 600 видно две карточки, до 1200 — четыре, дальше лента', async ({ page }) => {
    test.slow();
    await page.goto('/');

    const cards = page.locator('#reviews li[data-role="review"]:visible');

    await page.setViewportSize({ width: 375, height: 900 });
    await expect(cards).toHaveCount(2);

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(cards).toHaveCount(4);

    /* 🔴 С 1200 показаны все отзывы: лента листается, и прятать в ней нечего.
       Кнопка «Все отзывы» там не нужна и убрана из обхода клавиатурой. */
    await page.setViewportSize({ width: 1200, height: 900 });
    await expect(await cards.count()).toBeGreaterThan(4);
    await expect(page.locator('#reviews').getByRole('button', { name: 'Все отзывы' })).toBeHidden();
  });

  /**
   * 🔴 Кнопка ничего не грузит — она снимает ограничение показа (ADR-195):
   * скрытые карточки всё это время лежат в разметке, и робот видит раздел
   * целиком (инвариант 1).
   */
  test('«Все отзывы» раскрывает список, не ходя на сервер', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/');

    const section = page.locator('#reviews');
    const all = section.getByRole('button', { name: 'Все отзывы' });
    const visible = section.locator('li[data-role="review"]:visible');
    const inMarkup = section.locator('li[data-role="review"]');

    const total = await inMarkup.count();
    test.skip(total <= 2, 'в базе меньше трёх одобренных отзывов — раскрывать нечего');

    await expect(visible).toHaveCount(2);
    await expect(all).toHaveAttribute('aria-expanded', 'false');

    let requests = 0;
    page.on('request', () => {
      requests += 1;
    });
    await all.click();

    await expect(section.getByRole('button', { name: 'Свернуть отзывы' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(visible).toHaveCount(total);
    expect(requests, 'раскрытие не должно ходить на сервер').toBe(0);
  });

  /**
   * 🔴 Обрезка визуальная: скрытая часть не удаляется. Проверяется по
   * исходному коду страницы, а не по видимому тексту — именно его читает
   * поисковик, не дождавшийся JavaScript.
   */
  test('полный текст обрезанного отзыва остаётся в HTML и открывается окном', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/');

    const clipped = page.locator('#reviews li[data-role="review"]:visible').filter({
      hasText: 'Читать целиком',
    });
    test.skip((await clipped.count()) === 0, 'ни один видимый отзыв не обрезается на этой ширине');

    const card = clipped.first();
    const full = await card.locator('blockquote p').textContent();
    expect(full ?? '').not.toContain('…');

    /* Окно открывается нажатием на карточку целиком, а не только на подпись:
       площадь цели на телефоне важнее аккуратности. */
    await card.getByRole('button').click();

    const dialog = page.getByRole('dialog', { name: 'Отзыв клиента' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText((full ?? '').trim(), { exact: false })).toBeVisible();

    // закрытие тремя способами: Escape, крестик, клик по подложке
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await card.getByRole('button').click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Закрыть' }).click();
    await expect(dialog).toBeHidden();

    await card.getByRole('button').click();
    await expect(dialog).toBeVisible();
    // подложка — то, что вокруг окна: жмём в левый верхний угол экрана
    await page.mouse.click(4, 4);
    await expect(dialog).toBeHidden();
  });
});
