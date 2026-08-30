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

/**
 * Порог, ниже которого нижний угол принадлежит липкой панели действий, а не
 * кнопке «наверх». Число повторяет `WIDE_SCREEN_QUERY` из
 * `shared/config/breakpoints`: импортировать оттуда нельзя — сценарии
 * собираются вне алиасов приложения, поэтому здесь стоит ссылка, а не копия
 * без адреса.
 */
const WIDE_SCREEN = 600;

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

      /* Замер с повтором, а не однократный: в деве стили приезжают отдельными
         запросами, и в первый миг после загрузки лента доверия успевает
         торчать за край — `overflow: hidden` к ней ещё не применён. Проверяем
         «страница не скроллится», а не «не скроллится в первую миллисекунду»;
         настоящее переполнение никуда не денется и за таймаут. */
      await expect
        .poll(() =>
          page.evaluate(() => {
            const root = document.documentElement;
            return root.scrollWidth - root.clientWidth;
          }),
        )
        .toBeLessThanOrEqual(0);
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

test.describe('Поведение лендинга', () => {
  test('адрес следует за секцией, которую читают', async ({ page }) => {
    await page.goto('/');
    await page.locator('#catalog').waitFor();

    const scrollTo = async (id: string): Promise<void> => {
      await page.evaluate((target) => {
        const section = target === '' ? null : document.querySelector(`#${target}`);
        const top =
          section === null ? 0 : section.getBoundingClientRect().top + window.scrollY + 80;
        window.scrollTo({ top, behavior: 'instant' });
      }, id);
    };

    /* Первая проверка с повтором: до гидратации наблюдателя ещё нет, и адрес
       остаётся чистым — это не поломка, а незаконченная загрузка. */
    const expectHash = async (id: string, hash: string): Promise<void> => {
      await expect(async () => {
        await scrollTo(id);
        await page.waitForTimeout(300);
        expect(new URL(page.url()).hash).toBe(hash);
      }).toPass();
    };

    await expectHash('prices', '#prices');
    await expectHash('reviews', '#reviews');
    // наверху адрес снова чистый: ссылка со страницы ведёт на её начало
    await expectHash('', '');
  });

  test('🔴 история не забивается якорями: назад уводит со страницы', async ({ page }) => {
    await page.goto('/');
    await page.locator('#catalog').waitFor();

    const before = await page.evaluate(() => history.length);
    for (const id of ['catalog', 'prices', 'service', 'contacts']) {
      await page.evaluate((target) => {
        const section = document.querySelector(`#${target}`);
        if (section !== null) {
          window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY + 80 });
        }
      }, id);
      await page.waitForTimeout(250);
    }

    expect(await page.evaluate(() => history.length)).toBe(before);
  });

  /**
   * 🔴 Дефект #180: кнопка «наверх» доводила страницу до липкой шапки и
   * вставала. Юнит-тест был зелёным — он проверял, что `scrollTo` вызван, а
   * уехала ли страница, jsdom не знает. Проверять здесь надо координату, и
   * только координату.
   *
   * 🔴 Ниже 600 кнопки нет вовсе: её место у нижнего края заняла липкая
   * панель действий, и две плавающие штуки в одном углу спорили бы за один
   * палец. Телефонную половину поведения проверяет соседний сценарий — тем
   * же порогом 600, что и `WIDE_SCREEN_QUERY` в коде.
   */
  test('🔴 кнопка «наверх» доводит страницу до самого начала', async ({ page, viewport }) => {
    test.skip(viewport === null || viewport.width < WIDE_SCREEN, 'ниже 600 кнопки нет');

    await page.goto('/');
    await page.locator('#catalog').waitFor();

    const button = page.getByRole('button', { name: 'Наверх' });

    /* Прокрутка повторяется до появления кнопки — тем же приёмом, что и вход в
       панель (`support/admin-ui`). Прокрутка, сделанная до гидрации, ничего не
       даёт: обработчик ещё не навешен, а Next возвращает страницу в начало.
       Ждать «сеть успокоится» здесь нельзя — дев-сервер держит открытым
       соединение горячей перезагрузки. */
    await expect(async () => {
      // до конца страницы: там формы заявки на экране нет и кнопка показывается
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await expect(button).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 45_000 });

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

    await button.click();

    // плавная прокрутка длится доли секунды — ждём её конца, а не гадаем
    await expect
      .poll(async () => page.evaluate(() => Math.round(window.scrollY)), { timeout: 10_000 })
      .toBe(0);

    /* Фокус обязан переехать в шапку: кнопка исчезает, и без переноса фокус
       провалился бы в никуда. Одно другому не мешает — в этом и была ошибка. */
    const focused = await page.evaluate(() => document.activeElement?.closest('header') !== null);
    expect(focused).toBe(true);
  });

  /**
   * 🔴 Обратная половина того же решения. Кнопку «наверх» с телефона убрали не
   * «за ненадобностью»: на 375 она накрывала «Заказать» в карточке каталога, а
   * её место у нижнего края заняла панель действий. Проверять поэтому надо обе
   * стороны сразу — иначе однажды исчезнут и кнопка, и панель, и до заявки с
   * телефона останется только прокрутка.
   */
  test('на телефоне нижний угол занимает панель действий, а не кнопка «наверх»', async ({
    page,
    viewport,
  }) => {
    test.skip(viewport !== null && viewport.width >= WIDE_SCREEN, 'панели действий нет с 600');

    await page.goto('/');
    await page.locator('#catalog').waitFor();

    /* Тем же приёмом, что и сценарий выше: панель появляется после гидратации
       и первого экрана, а прокрутка до неё ничего не даёт. */
    await expect(async () => {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await expect(page.getByRole('navigation', { name: 'Быстрые действия' })).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 45_000 });

    await expect(page.getByRole('button', { name: 'Наверх' })).toHaveCount(0);
  });

  test('🔴 протяжка по часам заканчивается вместе с кнопкой мыши', async ({ page }) => {
    await page.goto('/');
    const cells = page.locator('[class*="HoursGrid_grid"] button');
    await cells.first().waitFor();

    // ждём гидратации: до неё обработчики не навешаны
    await expect(async () => {
      await cells.nth(0).click();
      await expect(cells.nth(0)).toHaveAttribute('aria-pressed', 'true');
    }).toPass();
    await cells.nth(0).click();

    const state = async (): Promise<string> =>
      cells.evaluateAll((list) =>
        list.map((cell) => (cell.getAttribute('aria-pressed') === 'true' ? '1' : '0')).join(''),
      );
    const center = async (index: number): Promise<readonly [number, number]> => {
      const box = await cells.nth(index).boundingBox();
      if (box === null) throw new Error(`ячейка ${index} не видна`);
      return [box.x + box.width / 2, box.y + box.height / 2] as const;
    };

    const [startX, startY] = await center(2);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (const index of [3, 4]) {
      const [x, y] = await center(index);
      await page.mouse.move(x, y, { steps: 4 });
    }
    // протяжка действительно покрасила соседей, а не только стартовую ячейку
    expect((await state()).slice(2, 5)).toBe('111');

    // отпускаем далеко от сетки — так теряется `pointerup` у реального курсора
    await page.mouse.move(startX, startY - 300, { steps: 4 });
    await page.mouse.up();

    const afterRelease = await state();
    for (const index of [9, 10, 11]) {
      const [x, y] = await center(index);
      await page.mouse.move(x, y, { steps: 4 });
    }

    expect(await state()).toBe(afterRelease);
  });
});

test.describe('Разделы сайта', () => {
  test('каталог, База знаний и политика отвечают, удалённые адреса — 404', async ({ page }) => {
    // каталог вернулся вместе со страницами моделей (ADR-109)
    for (const path of ['/catalog', '/knowledge', '/privacy']) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
    }

    // остальной кластер удалён (ADR-049): адреса обязаны честно отдавать 404
    for (const path of ['/prices', '/installation', '/service', '/contacts']) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });

  test('🔴 со страницы 404 есть выход на главную: шапки там нет', async ({ page }) => {
    await page.goto('/takoy-stranicy-net');

    const home = page.getByRole('link', { name: /на главную/i });
    await expect(home).toHaveAttribute('href', '/');

    await home.click();
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('карта сайта содержит только существующие адреса', async ({ request }) => {
    /* Запас по времени: дев-сервер собирает маршрут по первому обращению, и
       под нагрузкой карта сайта успевала не уложиться в умолчание. Падающий
       через раз тест хуже отсутствующего — в следующий раз его спишут на
       «опять флейк» и пропустят настоящую поломку. */
    const response = await request.get('/sitemap.xml', { timeout: 60_000 });
    expect(response.status()).toBe(200);

    const xml = await response.text();
    expect(xml).toContain('/knowledge');
    // каталог и страницы моделей вернулись своими адресами (ADR-109)
    expect(xml).toContain('/catalog');

    /* Удалённый кластер посадочных (ADR-049) в карту попасть не может: адрес,
       которого нет, уводит робота на 404 и тратит краулинговый бюджет.
       Сравниваем с закрывающим тегом — иначе `/prices` нашёлся бы внутри
       любого более длинного адреса. */
    for (const gone of ['/prices', '/installation', '/service', '/contacts']) {
      expect(xml, gone).not.toContain(`${gone}</loc>`);
    }
  });
});
