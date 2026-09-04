import type { APIRequestContext, Page } from '@playwright/test';

/**
 * Публичные страницы, ширины и темы приёмки резиновой вёрстки (issue #285,
 * issue #286, веха «Резина · Фаза 9»).
 *
 * 🔴 Перечень один на все проверки фазы. Он уже подводил в другом месте: у
 * витрины список разделов был зашит в четырёх файлах порознь, и два раздела не
 * попали ни в один — прогон был зелёным, потому что проверять было нечего
 * (`e2e/vr/sections.ts`, issue #517). Здесь та же природа: маршрут, которого
 * нет в списке, не проверяется молча.
 */

/**
 * Четырнадцать ширин из PRD: по две-три внутри каждого диапазона и сами пороги
 * 600 / 900 / 1200. Между порогами раскладка обязана тянуться, а не стоять, и
 * увидеть это можно только замером в нескольких точках диапазона
 * (DESIGN_BRIEF §6).
 */
export const PUBLIC_WIDTHS = [
  320, 360, 375, 390, 414, 480, 540, 600, 768, 820, 900, 1024, 1200, 1440,
] as const;

export const PUBLIC_THEMES = ['light', 'dark'] as const;

export type PublicTheme = (typeof PUBLIC_THEMES)[number];

/**
 * Ниже этой ширины раскладка считается сенсорной, и цель обязана быть 44×44
 * вместо 24×24 (ADR-183, ADR-232, DESIGN_BRIEF §6).
 */
export const TOUCH_BELOW = 900;

/** Высота окна замера: одна на все ширины, чтобы числа сравнивались между собой. */
export const VIEWPORT_HEIGHT = 900;

/** Ключ темы в `localStorage` — тот же, что читает инлайн-скрипт в `<head>` (app/layout.tsx). */
const THEME_STORAGE_KEY = 'tk-theme';

export type PublicPage = {
  /** Английский идентификатор — инвариант 17, он же имя в отчётах. */
  readonly id: string;
  /** Человеческое имя маршрута для сообщения об отказе. */
  readonly title: string;
  readonly path: string;
};

/**
 * Маршруты с постоянным адресом. Динамические (`/catalog/[slug]`,
 * `/knowledge/[slug]`) и `/compare` собираются из живых данных: слаг товара и
 * статьи приходит из базы, а сравнение без параметров пусто — проверять там
 * нечего, тогда как таблица в четыре колонки на 320px и есть главный источник
 * горизонтального выезда.
 */
const FIXED_PAGES: readonly PublicPage[] = [
  { id: 'home', title: 'главная', path: '/' },
  { id: 'catalog', title: 'каталог', path: '/catalog' },
  { id: 'knowledge', title: 'база знаний', path: '/knowledge' },
  { id: 'privacy', title: 'политика', path: '/privacy' },
];

/** Сколько моделей ставится в сравнение: четыре колонки — предельная ширина таблицы. */
const COMPARED = 4;

async function listHrefs(
  request: APIRequestContext,
  listPath: string,
  prefix: string,
): Promise<readonly string[]> {
  const response = await request.get(listPath);
  if (!response.ok()) {
    throw new Error(`${listPath} ответил ${response.status()} — перечень маршрутов не собрать`);
  }
  const html = await response.text();
  const found = new Set<string>();
  for (const match of html.matchAll(new RegExp(`href="(${prefix}[^"#?]+)"`, 'g'))) {
    const href = match[1];
    if (href !== undefined) found.add(href);
  }
  return [...found];
}

function firstOrFail(hrefs: readonly string[], listPath: string, prefix: string): string {
  const [first] = hrefs;
  if (first === undefined) {
    throw new Error(
      `На ${listPath} нет ни одной ссылки вида ${prefix}… — маршрут остался бы непроверенным`,
    );
  }
  return first;
}

/**
 * Собирает семь маршрутов приёмки, подставляя живые слаги.
 *
 * 🔴 Отсутствие данных — отказ, а не пропуск: страница модели, которую не на
 * чем открыть, тихо выпала бы из 196 проверок, и отчёт назвал бы её зелёной.
 */
export async function resolvePublicPages(
  request: APIRequestContext,
): Promise<readonly PublicPage[]> {
  const products = await listHrefs(request, '/catalog', '/catalog/');
  const articles = await listHrefs(request, '/knowledge', '/knowledge/');

  const product = firstOrFail(products, '/catalog', '/catalog/');
  const article = firstOrFail(articles, '/knowledge', '/knowledge/');

  const slugs = products.slice(0, COMPARED).map((href) => href.replace('/catalog/', ''));
  const compare = `/compare?compare=${slugs.join(',')}`;

  return [
    ...FIXED_PAGES,
    { id: 'product', title: 'страница модели', path: product },
    { id: 'article', title: 'статья', path: article },
    { id: 'compare', title: `сравнение (${slugs.length} модели)`, path: compare },
  ];
}

/**
 * Ставит тему до первого кадра — так же, как её ставит живой посетитель.
 *
 * Атрибут `data-theme` вешает инлайн-скрипт в `<head>`, читая `localStorage`;
 * подмена атрибута после загрузки дала бы вспышку светлой темы и замер по
 * половине перекрашенной страницы.
 */
export async function useTheme(page: Page, theme: PublicTheme): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(String(key), String(value));
      } catch {
        /* приватный режим — тема останется системной, и правило `theme` это назовёт */
      }
    },
    [THEME_STORAGE_KEY, theme],
  );
  await page.emulateMedia({ colorScheme: theme });
}

/**
 * Открывает маршрут на заданной ширине и ждёт, пока страница перестанет
 * меняться сама.
 *
 * 🔴 Ширина ставится до перехода, а не после: часть решений принимается один
 * раз при гидрации (`IntersectionObserver` липкой панели, отключение частиц),
 * и замер после `setViewportSize` показывал бы раскладку, которой у пришедшего
 * на эту ширину человека не бывает.
 *
 * 🔴 Ждать `load`, а не `domcontentloaded`. С ранним ожиданием число
 * проверенных узлов гуляло между прогонами — 13 против 42 у каталога на одной
 * и той же ширине: раскрывашка подбора ещё не ожила, и половина целей в замер
 * не попадала. Замер, который иногда проверяет вдвое меньше, молча пропустит
 * дефект и останется зелёным.
 */
export async function openAtWidth(page: Page, path: string, width: number): Promise<void> {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  });
}
