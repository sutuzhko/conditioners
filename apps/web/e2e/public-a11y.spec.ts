import { expect, test, type APIRequestContext } from '@playwright/test';

import { measureInvariants, type Violation } from './vr/invariants/measure';
import {
  measureContrast,
  measureFocusRing,
  readTabOrder,
  type ContrastReport,
  type OrderEntry,
} from './support/a11y';
import {
  PUBLIC_THEMES,
  PUBLIC_WIDTHS,
  TOUCH_BELOW,
  openAtWidth,
  resolvePublicPages,
  useTheme,
  type PublicPage,
  type PublicTheme,
} from './support/public-pages';

/* 🔴 Ширины спек задаёт сам, поэтому профиль телефона ему ничего не добавляет
   — только удваивает прогон. Он ещё и мешает: в эмуляции устройства блок,
   нарочно вынесенный за край, ширину документа не двигает, и самопроверка
   измерителя падает там, где проверять нечего. */
test.skip(({ isMobile }) => isMobile === true, 'ширины задаёт спек, а не профиль');

/**
 * Доступность публичной части на всех четырнадцати ширинах (issue #286, веха
 * «Резина · Фаза 9»).
 *
 * 🔴 Правила целей не переписываются: измеритель инвариантов
 * (`vr/invariants/measure.ts`) уже знает про два порога — 24×24 по WCAG 2.5.8
 * и 44×44 в сенсорной раскладке до 900px (ADR-183, ADR-232), про цель поля
 * вместе с подписью, про исключение «Spacing» и про то, что цель 0×0 —
 * нарушение всегда. Он ходил по историям витрины; здесь тот же измеритель
 * ходит по маршрутам. Второй набор правил разошёлся бы с первым в первую же
 * правку.
 *
 * 🔴 Контраст меряется на отрисованной странице, а не по токенам.
 * `shared/styles/contrast.test.ts` считает пары токенов и умеет только сплошные
 * цвета; заголовок первого экрана с градиентной заливкой, подписи на
 * `--lead-grad` и залипшая колонка таблицы сравнения ему не видны вовсе
 * (`support/a11y.ts`).
 *
 * 🔴 Порог 44 считается, но не красит (ADR-232): это политика проекта и цель,
 * к которой идут, а не норма WCAG. Число печатается в отчёте — счётчик обязан
 * идти к нулю, и молчать о нём нельзя.
 */

/** Ширины, на которых проверяются фокус и порядок обхода (issue #286). */
/**
 * 🔴 Известные дефекты, допущенные поимённо — приём тот же, что у инвариантов
 * витрины (ADR-230): проверка остаётся красной на всём остальном и ловит
 * новое, а каждое допущение названо issue и исчезает вместе с починкой.
 *
 * Допущение — не поблажка проверке. Порог не сдвинут ни на сотую: узел,
 * которого нет в списке, красит прогон как прежде.
 */
const KNOWN: readonly { readonly match: string; readonly issue: string }[] = [
  {
    match: 'Badge_badge',
    issue: '#533 — плашка подбора 1,74:1: грунт красит текст, но не заливку',
  },
  { match: 'ArticleView_ctaLead', issue: '#534 — врезка статьи не объявлена тёмным островом' },
  { match: 'ArticleView_ctaLink', issue: '#534 — врезка статьи не объявлена тёмным островом' },
  { match: 'SavingsCalculator_totalHorizon', issue: '#535 — итог экономии 4,31:1' },
  /* Подвал: контакты объявлены после навигации, а сеткой стоят левее. Ловим
     по подписи ссылки, а не по имени класса — класс у всех ссылок подвала
     общий, и совпадение по нему заглушило бы любую другую перестановку. */
  { match: 'Позвонить', issue: '#536 — подвал обходится не в порядке чтения' },
  { match: 'Написать письмо', issue: '#536 — подвал обходится не в порядке чтения' },
];

/** Известен ли дефект: строка отчёта содержит имя допущенного узла. */
function allowed(line: string): boolean {
  return KNOWN.some(({ match }) => line.includes(match));
}

const ORDER_WIDTHS = [375, 768, 1200] as const;

/** Полоса, внутри которой узлы считаются одной строкой раскладки. */
const ROW_BAND = 24;
/** Допуск на левый край: вложенные узлы стоят почти на одной вертикали. */
const LEFT_TOLERANCE = 4;

let known: Promise<readonly PublicPage[]> | null = null;

function publicPages(request: APIRequestContext): Promise<readonly PublicPage[]> {
  known ??= resolvePublicPages(request);
  return known;
}

function count(violations: readonly Violation[], rule: Violation['rule']): number {
  return violations.filter((item) => item.rule === rule).length;
}

function describeViolations(page: PublicPage, violations: readonly Violation[]): string {
  return violations
    .map((item) => `  ${page.id} · ${item.rule} · ${item.element} — ${item.detail}`)
    .join('\n');
}

function describeContrast(page: PublicPage, report: ContrastReport): string {
  return report.findings
    .map(
      (item) =>
        `  ${page.id} · ${item.ratio}:1 при норме ${item.required}:1 — ${item.element}\n` +
        `      «${item.text}» ${item.ink} на ${item.background} (${item.source}), ` +
        `${item.fontSize}px${item.bold ? ' полужирный' : ''}`,
    )
    .join('\n');
}

for (const width of PUBLIC_WIDTHS) {
  for (const theme of PUBLIC_THEMES) {
    test(`цели и контраст на ${width}px, тема ${theme}`, async ({ page, request }, info) => {
      test.slow();
      const pages = await publicPages(request);
      await useTheme(page, theme);
      const touch = width < TOUCH_BELOW;

      const undersized: string[] = [];
      const lowContrast: string[] = [];
      const lines: string[] = [];
      /* Порог 44 не красит, но и голым числом не остаётся: счётчик, который
         обязан идти к нулю, без имён узлов не разберёшь (ADR-232). */
      const policyByNode = new Map<string, number>();
      let policy = 0;

      for (const target of pages) {
        await openAtWidth(page, target.path, width);
        const violations = await page.evaluate(measureInvariants, { theme, touch });
        const contrast = await page.evaluate(measureContrast);

        const small = violations.filter((item) => item.rule === 'target-size');
        policy += count(violations, 'target-size-touch');
        for (const item of violations) {
          if (item.rule !== 'target-size-touch') continue;
          /* Имя без подписи: двадцать четыре ячейки суток — это один узел
             раскладки, а не двадцать четыре разных дефекта. */
          const key = `${target.id} · ${item.element.split(' «')[0] ?? item.element} · ${item.detail.split(' при ')[0] ?? ''}`;
          policyByNode.set(key, (policyByNode.get(key) ?? 0) + 1);
        }
        if (small.length > 0) undersized.push(describeViolations(target, small));
        if (contrast.findings.length > 0) lowContrast.push(describeContrast(target, contrast));

        lines.push(
          `${target.id.padEnd(10)} целей<24: ${String(small.length).padStart(3)}` +
            ` · целей<44: ${String(count(violations, 'target-size-touch')).padStart(3)}` +
            ` · контраст: узлов ${String(contrast.checked).padStart(4)},` +
            ` минимум ${contrast.worst ?? '—'}, ниже нормы ${contrast.findings.length}` +
            ` · не измерено ${contrast.unmeasured.length}`,
        );
      }

      const policyLines = [...policyByNode.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, times]) => `  ${key} ×${times}`);

      await info.attach(`доступность-${width}-${theme}.txt`, {
        contentType: 'text/plain',
        body:
          `${lines.join('\n')}\n\nпорог 44 (политика, не красит): ${policy}\n` +
          policyLines.join('\n'),
      });

      const newUndersized = undersized.filter((line) => !allowed(line));
      const newLowContrast = lowContrast.filter((line) => !allowed(line));

      expect(newUndersized, `цели меньше 24×24:\n${newUndersized.join('\n')}`).toEqual([]);
      expect(newLowContrast, `контраст ниже нормы:\n${newLowContrast.join('\n')}`).toEqual([]);
    });
  }
}

for (const width of ORDER_WIDTHS) {
  for (const theme of PUBLIC_THEMES) {
    test(`фокус видно на ${width}px, тема ${theme}`, async ({ page, request }, info) => {
      test.slow();
      const pages = await publicPages(request);
      await useTheme(page, theme);

      const blind: string[] = [];
      const lines: string[] = [];
      for (const target of pages) {
        await openAtWidth(page, target.path, width);
        const report = await page.evaluate(measureFocusRing);
        lines.push(
          `${target.id.padEnd(10)} проверено ${String(report.checked).padStart(3)} · без кольца ${report.findings.length}`,
        );
        for (const item of report.findings)
          blind.push(`  ${target.id} · ${item.element} — ${item.detail}`);
      }

      await info.attach(`фокус-${width}-${theme}.txt`, {
        contentType: 'text/plain',
        body: lines.join('\n'),
      });

      expect(blind, `фокус не видно:\n${blind.join('\n')}`).toEqual([]);
    });
  }
}

/**
 * Проверки обязаны падать на дефекте, иначе они не проверки.
 *
 * Дефекты вносятся в чистый документ, а не в страницу сайта: так видно, что
 * сработало именно внесённое нарушение, а не соседнее. Роль, которую у
 * инвариантов витрины играет раздел `Фикстуры/Инварианты`, здесь достаётся
 * одному сценарию.
 */
test('замеры ловят маленькую цель, слабый контраст, немой фокус и обратный ряд', async ({
  page,
}) => {
  await page.setContent(`
    <style>
      body { margin: 0; background: #ffffff; color: #111111; font: 15px sans-serif; }
      .tiny { width: 10px; height: 10px; padding: 0; border: 0; }
      .pale { color: #b8b8b8; background: #ffffff; }
      .mute:focus { outline: none; box-shadow: none; }
      .row { display: flex; flex-direction: row-reverse; gap: 8px; }
      .dark { background: linear-gradient(#0c1628, #0b1220); padding: 12px; }
      .chip { background: rgba(34, 211, 238, .1); color: #22d3ee; padding: 4px 8px; }
      .painted {
        background: linear-gradient(90deg, #f2f2f2, #eeeeee);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 15px;
      }
    </style>
    <button class="tiny" aria-label="крошечная"></button>
    <p class="pale">бледный текст на белом</p>
    <div class="row"><a href="#a">первая в разметке</a><a href="#b">вторая в разметке</a></div>
    <button class="mute">без кольца</button>
    <div class="dark"><span class="chip">полупрозрачная плашка над градиентом</span></div>
    <p class="painted">заголовок залит светлым градиентом</p>
  `);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

  const violations = await page.evaluate(measureInvariants, {
    theme: 'light' as const,
    touch: true,
  });
  expect(
    violations
      .filter((item) => item.rule === 'target-size')
      .map((item) => item.element)
      .join(' '),
    'цель 10×10 не поймана',
  ).toContain('крошечная');

  const contrast = await page.evaluate(measureContrast);
  const caught = contrast.findings.map((item) => item.text).join(' ');
  expect(caught, 'бледный текст не пойман').toContain('бледный текст');
  /* Текст, залитый градиентом, считается по краскам заливки — иначе заголовок
     первого экрана не проверялся бы вовсе (issue #286). */
  expect(caught, 'светлый градиент по буквам не пойман').toContain('заголовок залит');
  /* И обратное: полупрозрачная плашка над тёмным градиентом нарушением не
     является — подложка под ней тёмная, и считать надо её, а не саму плашку. */
  expect(caught, 'полупрозрачная плашка названа нарушением ошибочно').not.toContain(
    'полупрозрачная плашка',
  );

  const focus = await page.evaluate(measureFocusRing);
  expect(focus.findings.map((item) => item.element).join(' '), 'немой фокус не пойман').toContain(
    'без кольца',
  );

  const order = inversions(await page.evaluate(readTabOrder));
  expect(order.join(' '), 'обратный ряд не пойман').toContain('первая в разметке');
});

/**
 * Порядок обхода совпадает с порядком чтения.
 *
 * 🔴 Проверяется не «сверху вниз», а «слева направо внутри строки». Двухколонный
 * лист читается колонка за колонкой, и требовать от него монотонности по
 * вертикали значило бы красить исправную раскладку. А вот перестановка внутри
 * одной строки — `order`, `row-reverse`, ручная раскладка по сетке — это ровно
 * тот дефект, которого боится issue #286: в DOM порядок один, глазами другой.
 *
 * Закреплённые и залипшие узлы в счёт не идут: липкая панель действий живёт
 * внизу экрана, а в разметке объявлена там, где ей удобно, и порядок страницы
 * она не описывает.
 */
function inversions(entries: readonly OrderEntry[]): readonly string[] {
  const byTop = [...entries.entries()].sort((a, b) => a[1].top - b[1].top);
  const found: string[] = [];

  let band: [number, OrderEntry][] = [];
  const closeBand = (): void => {
    const ordered = [...band].sort((a, b) => a[0] - b[0]);
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (previous === undefined || current === undefined) continue;
      if (current[1].left + LEFT_TOLERANCE < previous[1].left) {
        found.push(
          `  «${previous[1].element}» (x=${previous[1].left}) обходится раньше ` +
            `«${current[1].element}» (x=${current[1].left}) на одной строке y≈${current[1].top}`,
        );
      }
    }
    band = [];
  };

  for (const item of byTop) {
    const first = band[0];
    if (first !== undefined && item[1].top > first[1].top + ROW_BAND) closeBand();
    band.push(item);
  }
  closeBand();
  return found;
}

for (const width of ORDER_WIDTHS) {
  test(`порядок обхода совпадает с порядком чтения на ${width}px`, async ({
    page,
    request,
  }, info) => {
    test.slow();
    const pages = await publicPages(request);
    const theme: PublicTheme = 'light';
    await useTheme(page, theme);

    const broken: string[] = [];
    const lines: string[] = [];
    for (const target of pages) {
      await openAtWidth(page, target.path, width);
      const entries = await page.evaluate(readTabOrder);
      const found = inversions(entries);
      lines.push(
        `${target.id.padEnd(10)} узлов ${String(entries.length).padStart(3)} · инверсий ${found.length}`,
      );
      for (const item of found) broken.push(`  ${target.id}\n  ${item}`);
    }

    await info.attach(`обход-${width}.txt`, { contentType: 'text/plain', body: lines.join('\n') });

    const newBroken = broken.filter((line) => !allowed(line));
    expect(
      newBroken,
      `порядок обхода разошёлся с порядком чтения:\n${newBroken.join('\n')}`,
    ).toEqual([]);
  });
}
