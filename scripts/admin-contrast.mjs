#!/usr/bin/env node
/**
 * Контраст панели, замеренный на живом DOM.
 *
 * 🔴 Зачем отдельно от `shared/styles/contrast.test.ts`. Та проверка считает
 * пары токенов и умеет только сплошные цвета — полупрозрачные подложки она
 * честно пропускает. А половина поверхностей панели как раз полупрозрачна, и
 * краски там складываются слоями: плашка «Просрочен» 8% стоит на подсвеченной
 * строке 8%, и по токенам пара даёт 5.5:1, а на экране — 4.4:1, ниже нормы.
 * Такую разницу видно только там, где браузер уже всё смешал.
 *
 * Что делает: обходит разделы панели в обеих темах, для каждого видимого
 * текстового узла собирает стек фонов предков, смешивает его снизу вверх с
 * учётом альфы и сравнивает с цветом текста. Порог берётся по кеглю и
 * начертанию (WCAG 1.4.3), границы контролов проверяются по 1.4.11.
 *
 * Узлы с итоговой прозрачностью ниже 0.9 пропускаются: это выключенные и
 * гаснущие элементы, а они выведены из 1.4.3 явно.
 *
 * Запуск (панель должна быть поднята):
 *   node scripts/admin-contrast.mjs
 *   node scripts/admin-contrast.mjs --base http://localhost:3000
 *
 * Учётка и адрес берутся из тех же переменных, что у сквозных сценариев:
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

/** Порог AA для обычного текста (WCAG 1.4.3). */
const AA_TEXT = 4.5;
/** Порог AA для крупного текста и нетекстовых границ (WCAG 1.4.3, 1.4.11). */
const AA_LARGE = 3;

/**
 * Ниже этой итоговой прозрачности узел не проверяется: выключенные элементы
 * из требования 1.4.3 выведены, а гаснущая подсказка — это не текст страницы.
 */
const MIN_ALPHA = 0.9;

const THEMES = /** @type {const} */ (['light', 'dark']);

/* Замер идёт на десктопной ширине: на ней открыты и колонка разделов, и
   таблицы целиком — то есть максимум поверхностей за один проход. */
const VIEWPORT = { width: 1440, height: 900 };

/* Дев-сервер собирает раздел по первому обращению, и на холодной сборке это
   дольше умолчаний Playwright — те же 60 секунд, что в playwright.config. */
const NAVIGATION_TIMEOUT = 60_000;
/* Шрифт меняет кегль и начертание, а от них зависит порог: до готовности
   шрифтов замер считал бы по подменному семейству. */
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
 * выражением, потому что скрипт запускается голым node — тот же приём, что у
 * `contrast.test.ts` с tokens.css.
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
 * Замер внутри страницы. Функция уезжает в браузер целиком, поэтому ничего
 * из области видимости скрипта не захватывает — все пороги приходят аргументом.
 */
function probe({ aaText, aaLarge, minAlpha }) {
  /** Цвет из computed style. Всё, что не rgb(), считается неизмеримым. */
  const parse = (value) => {
    if (!value.startsWith('rgb')) return null;
    const parts = value.match(/-?[\d.]+/g);
    if (parts === null || parts.length < 3) return null;
    const [r, g, b, a] = parts.map(Number);
    return { r, g, b, a: a === undefined ? 1 : a };
  };

  /** Наложение верхнего слоя на нижний. Нижний всегда непрозрачен. */
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });

  const luminance = ({ r, g, b }) => {
    const channel = (value) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const contrast = (first, second) => {
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  const hex = ({ r, g, b }) =>
    `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

  /** Цепочка от узла до html вместе с накопленной прозрачностью каждого звена. */
  const chainOf = (el) => {
    const nodes = [];
    for (let node = el; node !== null; node = node.parentElement) nodes.push(node);

    const styles = nodes.map((node) => getComputedStyle(node));
    /* Прозрачность накапливается от корня вниз: `opacity` гасит поддерево
       целиком, поэтому у узла она равна произведению всех родительских. */
    const alphas = new Array(nodes.length);
    let carried = 1;
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      carried *= Number.parseFloat(styles[i].opacity);
      alphas[i] = carried;
    }
    return { nodes, styles, alphas };
  };

  /**
   * Фон под узлом: слои снизу вверх смешиваются с учётом альфы. Первый
   * полностью непрозрачный слой обрывает подъём — всё, что ниже, невидимо.
   *
   * Картинка или градиент в стеке до непрозрачного слоя делает замер
   * недостоверным: у такой подложки нет одного цвета, и врать числом хуже,
   * чем честно отчитаться, что узел не измерен.
   */
  const backdropOf = (chain, from) => {
    const layers = [];
    for (let i = from; i < chain.nodes.length; i += 1) {
      const style = chain.styles[i];
      if (style.backgroundImage !== 'none') return { color: null, reason: 'фон-картинка' };

      const bg = parse(style.backgroundColor);
      if (bg === null) return { color: null, reason: 'нечитаемый фон' };

      const alpha = bg.a * chain.alphas[i];
      if (alpha > 0) layers.push({ ...bg, a: alpha });
      if (alpha >= 1) break;
    }

    /* Основа — белый холст браузера: если ни один слой не оказался
       непрозрачным, под страницей видно именно его. */
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i -= 1) acc = over(layers[i], acc);
    return { color: acc, reason: null };
  };

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

  /** Текст самого узла, без вложенных: порог считается по его стилю. */
  const ownText = (el) => {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue ?? '';
    }
    return text.trim().replace(/\s+/g, ' ');
  };

  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    /* Меньше двух пикселей — это подпись для читалки, спрятанная обрезкой:
       глазами её не видят, и к контрасту требований нет. */
    if (rect.width < 2 || rect.height < 2) return false;
    return el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true });
  };

  const violations = new Map();
  const unmeasured = new Map();
  let checked = 0;
  let skippedFaded = 0;

  const record = (map, key, entry) => {
    const known = map.get(key);
    if (known === undefined) map.set(key, { ...entry, count: 1 });
    else known.count += 1;
  };

  for (const el of document.querySelectorAll('body *')) {
    const text = ownText(el);
    if (text === '' || !visible(el)) continue;

    const chain = chainOf(el);
    const style = chain.styles[0];
    const ink = parse(style.color);
    if (ink === null) continue;

    const alpha = ink.a * chain.alphas[0];
    if (alpha < minAlpha) {
      skippedFaded += 1;
      continue;
    }

    const backdrop = backdropOf(chain, 0);
    if (backdrop.color === null) {
      record(unmeasured, `${describe(el)}|${backdrop.reason}`, {
        selector: describe(el),
        text,
        reason: backdrop.reason,
      });
      continue;
    }

    checked += 1;

    const size = Number.parseFloat(style.fontSize);
    const bold = Number.parseInt(style.fontWeight, 10) >= 700;
    /* Крупный текст по 1.4.3: от 24px, а полужирный — от 18.66px. */
    const large = size >= 24 || (bold && size >= 18.66);
    const required = large ? aaLarge : aaText;

    const shown = over({ ...ink, a: alpha }, backdrop.color);
    const ratio = contrast(shown, backdrop.color);
    if (ratio >= required) continue;

    record(violations, `${describe(el)}|${hex(shown)}|${hex(backdrop.color)}`, {
      kind: large ? 'крупный текст' : 'текст',
      selector: describe(el),
      text,
      ink: hex(shown),
      bg: hex(backdrop.color),
      size,
      bold,
      ratio,
      required,
    });
  }

  /* Границы контролов — требование 1.4.11: край поля и кнопки обязан
     отличаться от того, что вокруг, иначе контрол не найти глазами. */
  const CONTROLS =
    'button, input, select, textarea, [role="button"], [role="switch"], [role="tab"], [role="checkbox"], [role="radio"]';

  for (const el of document.querySelectorAll(CONTROLS)) {
    if (!visible(el)) continue;

    /* 🔴 Исключение объявляет сам контрол атрибутом `data-contrast-border`
       со значением `scale` (ADR-235). Оно снимает проверку 1.4.11 только с
       границы и только там, где линия задаёт масштаб, а не очерчивает цель:
       час сетки календаря опознают по месту в столбце дня, а не по краю.
       Требование к тексту такого узла остаётся в силе — оно проверено выше.

       Атрибут, а не список классов в скрипте: исключение живёт рядом с
       разметкой, которая его заслужила, и уезжает вместе с ней. Список в
       скрипте протухал бы молча при первом переименовании класса. */
    if (el.getAttribute('data-contrast-border') === 'scale') continue;

    const chain = chainOf(el);
    const style = chain.styles[0];
    if (chain.alphas[0] < minAlpha) {
      skippedFaded += 1;
      continue;
    }

    /* Фон считается от родителя: собственная заливка контрола лежит под его
       же границей и краем служить не может. */
    const outside = backdropOf(chain, 1);
    if (outside.color === null) continue;

    let worst = null;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (style[`border${side}Style`] === 'none' || style[`border${side}Style`] === 'hidden') {
        continue;
      }
      if (Number.parseFloat(style[`border${side}Width`]) === 0) continue;

      const line = parse(style[`border${side}Color`]);
      if (line === null) continue;

      const alpha = line.a * chain.alphas[0];
      /* Прозрачная граница — это отсутствие границы: у кнопки она держит
         размер, а край рисует заливка. Тут проверять нечего. */
      if (alpha === 0) continue;

      const shown = over({ ...line, a: alpha }, outside.color);
      const ratio = contrast(shown, outside.color);
      if (worst === null || ratio < worst.ratio) worst = { ratio, ink: hex(shown) };
    }

    if (worst === null || worst.ratio >= aaLarge) continue;

    record(violations, `${describe(el)}|граница|${worst.ink}|${hex(outside.color)}`, {
      kind: 'граница контрола',
      selector: describe(el),
      text: ownText(el),
      ink: worst.ink,
      bg: hex(outside.color),
      size: Number.parseFloat(style.fontSize),
      bold: false,
      ratio: worst.ratio,
      required: aaLarge,
    });
  }

  return {
    checked,
    skippedFaded,
    violations: [...violations.values()],
    unmeasured: [...unmeasured.values()],
  };
}

async function main() {
  const sections = adminSections();
  const browser = await chromium.launch();

  /** Нарушение живёт в одной записи и копит разделы, где оно встретилось. */
  const found = new Map();
  const unmeasured = new Map();
  const rows = [];
  let total = 0;
  let faded = 0;

  for (const theme of THEMES) {
    /* Тема ставится эмуляцией схемы, а не подстановкой в localStorage:
       инлайн-скрипт в <head> при пустом хранилище берёт её у системы. */
    const context = await browser.newContext({
      baseURL: baseUrl,
      colorScheme: theme,
      reducedMotion: 'reduce',
      viewport: VIEWPORT,
    });

    /* Вход тем же маршрутом, что у сквозных сценариев (e2e/support/admin-api):
       запрос из контекста кладёт cookie сессии в его же хранилище. */
    const auth = await context.request.post('/api/auth/login', { data: { login, password } });
    if (auth.status() !== 204) {
      await browser.close();
      fail(`вход в панель не удался: код ${auth.status()}. Панель поднята на ${baseUrl}?`);
    }

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

    for (const section of sections) {
      const response = await page.goto(section, { waitUntil: 'domcontentloaded' });
      if (response !== null && response.status() >= 400) {
        await browser.close();
        fail(`${section} ответил ${response.status()} — замерять нечего`);
      }

      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.waitForTimeout(SETTLE_MS);

      const result = await page.evaluate(probe, {
        aaText: AA_TEXT,
        aaLarge: AA_LARGE,
        minAlpha: MIN_ALPHA,
      });

      total += result.checked;
      faded += result.skippedFaded;
      rows.push({ theme, section, ...result });

      for (const item of result.violations) {
        const key = `${theme}|${item.selector}|${item.ink}|${item.bg}|${item.kind}`;
        const known = found.get(key);
        if (known === undefined) found.set(key, { theme, ...item, sections: [section] });
        else known.sections.push(section);
      }
      for (const item of result.unmeasured) {
        const key = `${theme}|${item.selector}|${item.reason}`;
        if (!unmeasured.has(key)) unmeasured.set(key, { theme, ...item, sections: [] });
        unmeasured.get(key).sections.push(section);
      }
    }

    await context.close();
  }

  await browser.close();

  console.log('Контраст панели на живом DOM (WCAG 1.4.3, 1.4.11)\n');
  console.log(`  стенд ${baseUrl} · ${sections.length} разделов × ${THEMES.length} темы\n`);

  for (const row of rows) {
    const mark = row.violations.length === 0 ? '·' : '✗';
    console.log(
      `  ${mark} ${row.theme === 'light' ? 'светлая' : 'тёмная '} ${row.section.padEnd(22)}` +
        ` ${String(row.checked).padStart(4)} узлов, ${row.violations.length} нарушений`,
    );
  }

  console.log(
    `\n  проверено узлов: ${total} · пропущено по прозрачности ниже ${MIN_ALPHA}: ${faded}`,
  );

  if (unmeasured.size > 0) {
    console.log(`\n  не измерено (подложка без единого цвета): ${unmeasured.size}`);
    for (const item of [...unmeasured.values()].slice(0, 10)) {
      console.log(`    ${item.theme} · ${item.selector} — ${item.reason}`);
    }
  }

  const list = [...found.values()].sort((a, b) => a.ratio - b.ratio);
  if (list.length === 0) {
    console.log('\n✓ все пары проходят порог');
    return;
  }

  console.error(`\n✗ нарушений: ${list.length}\n`);
  for (const item of list) {
    const where =
      item.sections.length > 3 ? `${item.sections.length} разделов` : item.sections.join(', ');
    console.error(
      `  ${item.ratio.toFixed(2)}:1 при норме ${item.required}:1 — ${item.theme === 'light' ? 'светлая' : 'тёмная'} · ${item.kind}\n` +
        `    ${item.selector}\n` +
        `    «${item.text.slice(0, 60)}» ${item.ink} на ${item.bg}, ${item.size}px${item.bold ? ' полужирный' : ''}\n` +
        `    ${where}\n`,
    );
  }

  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
