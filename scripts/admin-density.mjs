#!/usr/bin/env node
/**
 * Плотность панели и размер тап-зон — замером в браузере.
 *
 * 🔴 Зачем. Плотность расходится с токенами незаметно: правило, поднимающее
 * цели до 44px на сенсорном экране, легко цепляет и мышиные раскладки — тогда
 * малая кнопка вырастает с 32 до 44 и перестаёт отличаться от средней. На
 * макете это ровно так и случилось, и нашлось только измерением: на глаз ряд
 * из одинаковых кнопок выглядит задуманным.
 *
 * Что делает:
 *   — на 1440 с точным указателем снимает высоты кнопок трёх размеров, поля и
 *     пункта навигации и сверяет с токенами плотности;
 *   — на 390 и 768 с грубым указателем снимает все интерактивные цели и падает
 *     на любой меньше 44×44;
 *   — на всех трёх ширинах проверяет, что раздел не едет вбок.
 *
 * Запуск (панель должна быть поднята):
 *   node scripts/admin-density.mjs
 *   node scripts/admin-density.mjs --base http://localhost:3000
 *
 * Учётка и адрес — из тех же переменных, что у сквозных сценариев:
 * E2E_BASE_URL, E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

/* Playwright — зависимость воркспейса `web`, а не корня, и pnpm его не
   поднимает наверх (shamefully-hoist=false в .npmrc). Из скрипта в корневом
   `scripts/` голый импорт не разрешается вовсе, поэтому модуль ищется от
   package.json приложения — там он лежит для сквозных тестов и снимков. */
const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
/** @type {{ chromium: import('@playwright/test').BrowserType }} */
const { chromium } = requireFromWeb('@playwright/test');

const SECTIONS_SOURCE = new URL('../apps/web/src/widgets/admin-shell/content.ts', import.meta.url);

/** Минимальная тап-зона (DESIGN_BRIEF §6). Меньше — палец промахивается. */
const TAP = 44;

/** Отклонение, которое ещё не считается расхождением: округление подпикселей. */
const TOLERANCE = 0.5;

/**
 * Что и с чем сверяется на мышиной ширине.
 *
 * Имена классов — модульные: в дев-сборке CSS Modules оставляют имя
 * компонента префиксом (`Button_sm__x1y2`), и по нему размер опознаётся
 * однозначно.
 *
 * 🔴 `base` — класс всего компонента, `part` — класс роли. Разница нужна,
 * чтобы отличить «в панели такого размера нет» от «класс переименовали»:
 * без неё переезд разметки выглядел бы как чистый прогон.
 *
 * `expected` — числа из плана редизайна панели. Они же лежат в токенах, когда
 * токены заведены; пока нет, сверка идёт с планом, и об этом сказано в отчёте.
 * `tags` сужает роль до однострочных контролов: у многострочного поля высота
 * своя по смыслу, и сверять её с плотностью кнопки бессмысленно.
 */
const DENSITY = [
  {
    name: 'кнопка md',
    css: '.btn',
    token: '--h-md',
    expected: 40,
    base: 'Button_button',
    part: 'Button_md',
  },
  {
    name: 'кнопка sm',
    css: '.btn.sm',
    token: '--h-sm',
    expected: 32,
    base: 'Button_button',
    part: 'Button_sm',
  },
  {
    name: 'кнопка lg',
    css: '.btn.lg',
    token: '--h-lg',
    expected: 48,
    base: 'Button_button',
    part: 'Button_lg',
  },
  {
    name: 'поле ввода',
    css: 'input, select',
    token: '--h-md',
    expected: 40,
    base: 'control_control',
    part: 'control_control',
    tags: ['INPUT', 'SELECT'],
  },
  {
    name: 'пункт навигации',
    css: 'nav a',
    token: '--h-nav',
    expected: 44,
    base: 'AdminNav_link',
    part: 'AdminNav_link',
  },
];

/** Ширина мыши — на ней и снимается плотность. */
const DESKTOP = 1440;
/** Ширины пальца: телефон и планшет из макета. */
const TOUCH_WIDTHS = [390, 768];

const VIEWPORT_HEIGHT = 900;

/* Дев-сервер собирает раздел по первому обращению, и на холодной сборке это
   дольше умолчаний Playwright — те же 60 секунд, что в playwright.config. */
const NAVIGATION_TIMEOUT = 60_000;
/* Кегль и высота строки зависят от шрифта, а высота контрола — от них. */
const SETTLE_MS = 400;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const { values } = parseArgs({ options: { base: { type: 'string' } } });

const baseUrl = values.base ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const login = process.env.E2E_ADMIN_LOGIN ?? 'admin';
const password = process.env.E2E_ADMIN_PASSWORD ?? 'admin';

/**
 * Разделы берутся из карты панели, а не переписываются списком: раздел,
 * добавленный в `content.ts`, обязан попадать в замер сам. Читаются регулярным
 * выражением, потому что скрипт запускается голым node.
 */
function adminSections() {
  const source = readFileSync(SECTIONS_SOURCE, 'utf8');
  const start = source.indexOf('export const ADMIN_SECTIONS');
  if (start === -1) fail('в content.ts не нашёлся ADMIN_SECTIONS — карта разделов переехала');

  const block = source.slice(start, source.indexOf('\n];', start));
  const hrefs = [...block.matchAll(/href:\s*'([^']+)'/g)].map((match) => match[1]);
  if (hrefs.length === 0) fail('карта разделов пуста — читать нечего');
  return hrefs;
}

/**
 * Замер внутри страницы: уезжает в браузер целиком, поэтому ничего из области
 * видимости скрипта не захватывает.
 */
function measure({ density, tap }) {
  const describe = (el) => {
    const parts = [];
    for (let node = el, depth = 0; node !== null && depth < 3; node = node.parentElement, depth++) {
      const classes = (node.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean);
      parts.unshift(
        node.tagName.toLowerCase() +
          classes
            .slice(0, 2)
            .map((c) => `.${c}`)
            .join(''),
      );
    }
    return parts.join(' > ');
  };

  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true });
  };

  /**
   * Настоящая тап-зона: у мелкой кнопки-иконки её добирает прозрачный
   * псевдоэлемент (`IconButton::after` растягивается до `--tap`), и мерить
   * только рамку — значит объявлять нарушением то, что уже починено.
   */
  const target = (el) => {
    const rect = el.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;

    for (const pseudo of ['::before', '::after']) {
      const style = getComputedStyle(el, pseudo);
      if (style.content === 'none' || style.content === 'normal') continue;
      if (style.position !== 'absolute' && style.position !== 'fixed') continue;

      const w = Number.parseFloat(style.width);
      const h = Number.parseFloat(style.height);
      if (Number.isFinite(w)) width = Math.max(width, w);
      if (Number.isFinite(h)) height = Math.max(height, h);
    }

    return { width, height };
  };

  const root = getComputedStyle(document.documentElement);
  const classesOf = (el) => (el.getAttribute('class') ?? '').split(/\s+/);

  /* Плотность: высота каждого найденного экземпляра, сгруппированная по
     размеру, — расхождение внутри одной роли важнее среднего по больнице. */
  const densityRows = density.map((row) => {
    const painted = [...document.querySelectorAll('[class]')].filter(visible);
    const wears = (el, name) => classesOf(el).some((cls) => cls.startsWith(`${name}__`));

    /* Размер кнопки — отдельный класс, а не отсутствие модификатора:
       компонент проставляет `Button_md` даже при умолчании. */
    const found = painted.filter(
      (el) => wears(el, row.part) && (row.tags === undefined || row.tags.includes(el.tagName)),
    );

    const heights = found.map((el) => Math.round(el.getBoundingClientRect().height * 10) / 10);
    return {
      name: row.name,
      css: row.css,
      token: row.token,
      expected: row.expected,
      declared: root.getPropertyValue(row.token).trim(),
      /* Компонент на странице есть, а роли нет — значит роль просто не
         используется; нет и компонента — значит замер смотрит не туда. */
      module: painted.some((el) => wears(el, row.base)),
      count: heights.length,
      heights: [...new Set(heights)].sort((a, b) => a - b),
    };
  });

  /* Интерактивная цель — всё, до чего человек дотягивается пальцем. */
  const INTERACTIVE =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [tabindex]:not([tabindex="-1"])';

  const small = new Map();
  let targets = 0;

  if (tap > 0) {
    for (const el of document.querySelectorAll(INTERACTIVE)) {
      if (!visible(el)) continue;
      if ('disabled' in el && el.disabled === true) continue;

      targets += 1;
      const { width, height } = target(el);
      if (width >= tap && height >= tap) continue;

      /* Ключ — только селектор: у одного и того же элемента ширина пляшет от
         содержимого (телефон, имя, номер заказа), и разбивать по ней значило
         бы вывалить сотню строк там, где дефект один. Показывается самый
         мелкий экземпляр — по нему промахиваются первым. */
      const key = describe(el);
      const item = {
        selector: key,
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40),
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10,
        count: 1,
      };

      const known = small.get(key);
      if (known === undefined) small.set(key, item);
      else {
        known.count += 1;
        if (item.width * item.height < known.width * known.height) {
          known.width = item.width;
          known.height = item.height;
          known.text = item.text;
        }
      }
    }
  }

  return {
    pointer: matchMedia('(pointer: coarse)').matches ? 'грубый' : 'точный',
    density: densityRows,
    targets,
    small: [...small.values()],
    layout: {
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    },
  };
}

async function visit(context, sections, options) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

  const results = [];
  for (const section of sections) {
    const response = await page.goto(section, { waitUntil: 'domcontentloaded' });
    if (response !== null && response.status() >= 400) {
      fail(`${section} ответил ${response.status()} — замерять нечего`);
    }

    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForTimeout(SETTLE_MS);

    results.push({ section, ...(await page.evaluate(measure, options)) });
  }

  await page.close();
  return results;
}

async function contextFor(browser, width, touch) {
  const context = await browser.newContext({
    baseURL: baseUrl,
    reducedMotion: 'reduce',
    viewport: { width, height: VIEWPORT_HEIGHT },
    hasTouch: touch,
  });

  /* Вход тем же маршрутом, что у сквозных сценариев (e2e/support/admin-api):
     запрос из контекста кладёт cookie сессии в его же хранилище. */
  const auth = await context.request.post('/api/auth/login', { data: { login, password } });
  if (auth.status() !== 204) {
    fail(`вход в панель не удался: код ${auth.status()}. Панель поднята на ${baseUrl}?`);
  }
  return context;
}

async function main() {
  const sections = adminSections();
  const browser = await chromium.launch();
  /** Расхождения по разделам отчёта: итог должен читаться, а не листаться. */
  const problems = { плотность: [], тапзоны: [], прокрутка: [] };

  console.log('Плотность панели и тап-зоны (DESIGN_BRIEF §6)\n');
  console.log(`  стенд ${baseUrl} · ${sections.length} разделов\n`);

  /* Мышиная ширина: здесь у малой кнопки нет права вырастать до 44px. */
  const desktopContext = await contextFor(browser, DESKTOP, false);
  const desktop = await visit(desktopContext, sections, { density: DENSITY, tap: 0 });
  await desktopContext.close();

  console.log(`Плотность на ${DESKTOP} (указатель ${desktop[0].pointer})\n`);

  for (const [index, row] of DENSITY.entries()) {
    const seen = desktop.map((page) => page.density[index]);
    const heights = [...new Set(seen.flatMap((item) => item.heights))].sort((a, b) => a - b);
    const count = seen.reduce((sum, item) => sum + item.count, 0);
    const declared = seen[0].declared;

    if (count === 0) {
      /* Компонент на страницах есть, а этой роли нет — мерить просто нечего.
         Нет и компонента — значит замер смотрит не туда, и это отказ. */
      const known = seen.some((item) => item.module);
      console.log(
        `  ${known ? '·' : '✗'} ${row.name.padEnd(17)} ${row.css.padEnd(14)}` +
          (known ? ' в панели не встречается' : ` класс «${row.part}» не найден`),
      );
      if (!known) {
        problems.плотность.push(
          `${row.name} (${row.css}): класс «${row.part}» не найден — разметка переехала, ` +
            'и роль молча выпала бы из замера',
        );
      }
      continue;
    }

    const off = heights.filter((h) => Math.abs(h - row.expected) > TOLERANCE);
    const mark = off.length === 0 ? '·' : '✗';
    console.log(
      `  ${mark} ${row.name.padEnd(17)} ${row.css.padEnd(14)} ${row.token.padEnd(8)}` +
        ` ждём ${String(row.expected).padStart(3)}px · замер ${heights.map((h) => `${h}px`).join(', ')}` +
        ` · ${count} шт.${declared === '' ? ' · токен не задан' : ` · токен ${declared}`}`,
    );

    if (off.length > 0) {
      problems.плотность.push(
        `${row.name} (${row.css}) — ${off.map((h) => `${h}px`).join(', ')} при ${row.expected}px по ${row.token}`,
      );
    }
  }

  const missing = DENSITY.filter((row, index) => desktop[0].density[index].declared === '');
  if (missing.length > 0) {
    console.log(
      `\n  🔴 токенов плотности в палитре нет: ${[...new Set(missing.map((r) => r.token))].join(', ')}.` +
        '\n     Сверка идёт с числами плана редизайна — заведите токены, и сверка пойдёт с ними',
    );
  }

  /* Пальцевые ширины: цель меньше 44×44 — это промах, а не мелочь. */
  const touchPages = [];
  for (const width of TOUCH_WIDTHS) {
    const context = await contextFor(browser, width, true);
    const pages = await visit(context, sections, { density: [], tap: TAP });
    await context.close();

    console.log(`\nТап-зоны на ${width} (указатель ${pages[0].pointer})\n`);
    const targets = pages.reduce((sum, page) => sum + page.targets, 0);

    const small = new Map();
    for (const page of pages) {
      for (const item of page.small) {
        const known = small.get(item.selector);
        if (known === undefined) small.set(item.selector, { ...item, sections: [page.section] });
        else {
          known.sections.push(page.section);
          known.count += item.count;
          if (item.width * item.height < known.width * known.height) {
            known.width = item.width;
            known.height = item.height;
            known.text = item.text;
          }
        }
      }
    }

    console.log(`  целей проверено: ${targets} · мельче ${TAP}×${TAP}: ${small.size}\n`);
    for (const item of [...small.values()].sort(
      (a, b) => a.width * a.height - b.width * b.height,
    )) {
      const where =
        item.sections.length > 3 ? `${item.sections.length} разделов` : item.sections.join(', ');
      console.log(
        `  ✗ ${item.width}×${item.height} — ${item.selector}\n` +
          `      «${item.text}» · ${item.count} шт. · ${where}`,
      );
      problems.тапзоны.push(`${width}px: ${item.width}×${item.height} — ${item.selector}`);
    }

    touchPages.push({ width, pages });
  }

  console.log('\nГоризонтальная прокрутка\n');
  for (const { width, pages } of [{ width: DESKTOP, pages: desktop }, ...touchPages]) {
    const wide = pages.filter((page) => page.layout.scroll > page.layout.client);
    if (wide.length === 0) {
      console.log(`  · ${width}px — ни один раздел не едет вбок`);
      continue;
    }
    for (const page of wide) {
      console.log(
        `  ✗ ${width}px ${page.section}: документ ${page.layout.scroll} при окне ${page.layout.client}`,
      );
      problems.прокрутка.push(
        `${width}px: ${page.section} прокручивается вбок — ${page.layout.scroll} против ${page.layout.client}`,
      );
    }
  }

  await browser.close();

  const total = Object.values(problems).reduce((sum, list) => sum + list.length, 0);
  if (total === 0) {
    console.log('\n✓ плотность и тап-зоны в норме');
    return;
  }

  /* Итог — счёт по разделам, а не повтор всех строк: подробности выше, а
     внизу должно быть видно, чего и сколько, без прокрутки на два экрана. */
  console.error(
    `\n✗ расхождений: ${total}` +
      `\n  плотность: ${problems.плотность.length}` +
      `\n  тап-зоны: ${problems.тапзоны.length}` +
      `\n  горизонтальная прокрутка: ${problems.прокрутка.length}\n`,
  );
  for (const problem of [...problems.плотность, ...problems.прокрутка]) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
