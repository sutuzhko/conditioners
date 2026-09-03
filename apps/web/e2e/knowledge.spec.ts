import { expect, test } from '@playwright/test';

/**
 * Внутренние страницы кластера: листинг Базы знаний, статья, политика и
 * страница 404 (issue #279, #280, #282, #283, #284, #291).
 *
 * 🔴 Проверяется то, что юнит-тест показать не может: настоящий код ответа,
 * отсутствие горизонтальной прокрутки, длина строки в браузере и то, что
 * свёрнутый ответ FAQ действительно лежит в исходном коде страницы.
 *
 * Данные здесь не проверяются: в базе стоят заглушки «ЗАПОЛНИТЕ В АДМИНКЕ»
 * (инвариант 8) — сценарии смотрят на устройство страниц, а не на их
 * содержимое.
 */

/** Ширины из docs/DESIGN_BRIEF.md §6 — те же, что у снепшотов историй. */
const WIDTHS = [320, 375, 768, 1200] as const;

/** Норма длины строки текста: docs/DESIGN_BRIEF.md §4, issue #280. */
const MAX_LINE = 680;

test.describe('База знаний', () => {
  test('листинг отдаётся сервером и не уезжает вбок ни на одной ширине', async ({ browser }) => {
    // без JS — то, что видит робот, не дождавшийся скриптов (инвариант 1)
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/knowledge');

      await expect(page.locator('h1')).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `ширина ${width}`).toBeLessThanOrEqual(0);
    }

    await context.close();
  });

  test('🔴 карточка статьи — одна ссылка: вложенных в неё ссылок нет', async ({ page }) => {
    await page.goto('/knowledge');

    const cards = page.locator('main ul li');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      await expect(cards.nth(i).locator('a')).toHaveCount(1);
    }
  });

  test('фильтр рубрик работает адресом, а не скриптом', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/knowledge');

    const chip = page.locator('nav[aria-label="Рубрики статей"] a').nth(1);
    const label = (await chip.textContent())?.trim() ?? '';
    await chip.click();

    await expect(page).toHaveURL(/category=/);
    await expect(
      page.locator('nav[aria-label="Рубрики статей"] a[aria-current="page"]'),
    ).toHaveText(label);

    await context.close();
  });

  test('🔴 строка статьи не длиннее нормы и ничего не уезжает за край', async ({ page }) => {
    await page.goto('/knowledge');
    const first = page.locator('main ul li a').first();
    await first.click();
    await expect(page.locator('article h1')).toHaveCount(1);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      const measured = await page.evaluate(() => {
        const paragraphs = Array.from(document.querySelectorAll('article p'));
        const widths = paragraphs
          .filter((p) => (p.textContent ?? '').length > 90)
          .map((p) => Math.round(p.getBoundingClientRect().width));

        return {
          line: widths.length === 0 ? 0 : Math.max(...widths),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });

      expect(measured.line, `ширина ${width}`).toBeLessThanOrEqual(MAX_LINE);
      expect(measured.overflow, `ширина ${width}`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('Частые вопросы', () => {
  test('🔴 ответы лежат в исходном коде страницы свёрнутыми', async ({ request, page }) => {
    // берём именно HTML ответа сервера, а не DOM: разметке FAQPage нужен он
    const html = await (await request.get('/')).text();
    await page.goto('/');

    const rows = page.locator('#faq details');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const answer = (await rows.nth(i).locator('p').innerText()).trim();
      expect(answer.length).toBeGreaterThan(0);
      expect(html).toContain(answer.slice(0, 60));
      await expect(rows.nth(i)).not.toHaveAttribute('open', /.*/);
    }
  });

  test('раскрывается с клавиатуры, и открыт не больше одного вопроса', async ({ page }) => {
    await page.goto('/');

    const rows = page.locator('#faq details');
    await rows.first().locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(rows.first()).toHaveAttribute('open', /.*/);

    await rows.nth(1).locator('summary').click();
    await expect(rows.nth(1)).toHaveAttribute('open', /.*/);
    await expect(rows.first()).not.toHaveAttribute('open', /.*/);
  });
});

test.describe('Политика и страница 404', () => {
  test('политика открывается по ссылке из подвала', async ({ page }) => {
    await page.goto('/');

    const href = await page.locator('footer a[href="/privacy"]').first().getAttribute('href');
    expect(href).toBe('/privacy');

    await page.goto('/privacy');
    await expect(page.locator('h1')).toHaveCount(1);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `ширина ${width}`).toBeLessThanOrEqual(0);
    }
  });

  test('🔴 404 отдаётся настоящим кодом, с шапкой, подвалом и noindex', async ({ page }) => {
    const response = await page.goto('/etoy-stranicy-net');

    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('main#top ~ footer')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex.*follow/);
  });
});
