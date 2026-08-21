import { expect, test } from '@playwright/test';

/**
 * Дымовые сценарии: сайт поднимается, отдаёт контент сервером и не разъезжается
 * по ширине. Ими же проверяется, что браузер в образе рабочий (ADR-021).
 *
 * Данные здесь не проверяются: в базе стоят заглушки «ЗАПОЛНИТЕ В АДМИНКЕ»,
 * и ждать от них конкретных телефонов и цен нельзя (инвариант 8).
 */

/** Ширины из docs/DESIGN_BRIEF.md §6 — те же, что у снепшотов историй. */
const WIDTHS = [320, 375, 768, 1200] as const;

test.describe('Лендинг', () => {
  test('отдаётся сервером: заголовок есть в HTML до всякого JavaScript', async ({ browser }) => {
    // страница без JS — то, что видит робот, не дождавшийся скриптов (инвариант 1)
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).not.toBeEmpty();
    await expect(page.locator('section#catalog')).toBeVisible();

    await context.close();
  });

  test('разделы навигации ведут на существующие якоря', async ({ page }) => {
    await page.goto('/');

    const links = page.locator('header nav a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).not.toBeNull();
      if (href === null || !href.includes('#')) continue;

      const id = href.slice(href.indexOf('#') + 1);
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  for (const width of WIDTHS) {
    test(`на ${width}px страница не скроллится по горизонтали`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth - root.clientWidth;
      });

      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('ряды доверия и симптомов остаются одной строкой', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // ряды меряются после того, как оба отрисованы: пустой контейнер дал бы
    // «одну строку» и тест прошёл бы, ничего не проверив
    await page.locator('#service [role="group"] button').first().waitFor();

    /* Контейнеры ищутся по семантике, а не по имени класса: у CSS Modules
       `chips` и `chipsLabel` начинаются одинаково, и селектор по подстроке
       ловит подпись вместо ряда. */
    const rows = await page.evaluate(() => {
      const lines = (box: Element | null): number => {
        if (box === null) return -1;
        const tops = [...box.children].map((child) =>
          Math.round(child.getBoundingClientRect().top),
        );
        return new Set(tops).size;
      };

      return {
        trust: lines(document.querySelector('main section:first-of-type ul')),
        symptoms: lines(document.querySelector('#service [role="group"]')),
      };
    });

    expect(rows.trust, JSON.stringify(rows)).toBe(1);
    expect(rows.symptoms, JSON.stringify(rows)).toBe(1);
  });
});

test.describe('Разделы сайта', () => {
  test('База знаний и политика отвечают, удалённые адреса — 404', async ({ page }) => {
    for (const path of ['/knowledge', '/privacy']) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
    }

    // кластер удалён (ADR-049): адреса обязаны честно отдавать 404
    for (const path of ['/catalog', '/prices', '/installation', '/service', '/contacts']) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });

  test('карта сайта содержит только существующие адреса', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);

    const xml = await response.text();
    expect(xml).toContain('/knowledge');
    expect(xml).not.toContain('/catalog');
  });
});
