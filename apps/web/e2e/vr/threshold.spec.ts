import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { VR_KIT_SCREENSHOT, VR_SCREENSHOT } from '../../playwright.vr.config';

/**
 * Самотест порогов сравнения кадров (issue #801).
 *
 * 🔴 Порог, который ни разу не падал, не доказан — то же основание, что у
 * историй-фикстур инвариантов (`invariants/fixtures.spec.ts`, issue #456).
 * Разница в том, что фикстуре порога нужны **два кадра одного и того же
 * контрола**, различающиеся ровно краской границы, — а работа пайплайна
 * сравнивает кадр ветки с кадром базы и новую историю не сравнивает вовсе
 * (`snapshot-run.ts`). Историей витрины это не проверяется физически: история,
 * заведённая веткой, в базе отсутствует и проходит мимо сравнения.
 *
 * Поэтому спек берёт роль работы на себя: снимает кадр, кладёт его эталоном в
 * свой каталог, перекрашивает границу и спрашивает **настоящее сравнение**
 * Playwright — тем же кодом и с теми же порогами, что в работе.
 *
 * 🔴 Витрина не нужна: контролы рисует `page.setContent`, шрифтов в них нет,
 * и кадр зависит только от геометрии и краски. Числа геометрии — не выдуманы,
 * а взяты из измерений кита (`measurements/ui-kit-*.txt`): кнопка 87×44 r11 b1,
 * дорожка переключателя 44×26 r100 b1, рамка галочки 20×20 r6 b1.
 *
 * 🔴 Оба кадра снимает один прогон в одном браузере, поэтому у фикстуры нет
 * платформы в имени и её вердикт одинаков на macOS и в образе CI: она
 * проверяет арифметику сравнения, а не отрисовку шрифтов.
 */

/** Краски границы из измерений `ui-kit-button--variants` до и после #732. */
const DANGER_BEFORE = '#be123c73';
const DANGER_AFTER = '#be123cb3';

type Fixture = {
  /** Имя случая и имя файла кадра. */
  readonly name: string;
  /** Разметка контрола: границу красит переменная `--line`. */
  readonly markup: string;
  /**
   * Прямые участки контура в точках — сколько точек границы вообще способно
   * попасть в счёт. Скругления сглажены, а сглаженные точки pixelmatch из
   * счёта выбрасывает, поэтому ожидание считается по прямым: `2 × (ширина −
   * 2r) + 2 × (высота − 2r)`.
   */
  readonly straight: number;
};

const FIXTURES: readonly Fixture[] = [
  {
    name: 'кнопка 87×44 r11',
    markup:
      '<span style="display:block;width:87px;height:44px;border-radius:11px;' +
      'border:1px solid var(--line);background:#be123c14"></span>',
    straight: 2 * (87 - 22) + 2 * (44 - 22),
  },
  {
    name: 'дорожка переключателя 44×26 r13',
    markup:
      '<span style="display:block;width:44px;height:26px;border-radius:100px;' +
      'border:1px solid var(--line);background:#ffffff"></span>',
    straight: 2 * (44 - 26) + 2 * (26 - 26),
  },
  {
    name: 'рамка галочки 20×20 r6',
    markup:
      '<span style="display:block;width:20px;height:20px;border-radius:6px;' +
      'border:1px solid var(--line);background:#ffffff"></span>',
    straight: 2 * (20 - 12) + 2 * (20 - 12),
  },
];

/** Страница с одним контролом на белом фоне — как история кита. */
function page(markup: string, line: string): string {
  return `<!doctype html>
<html data-theme="light" style="--line:${line}">
<head><meta charset="utf-8"><style>
  html, body { margin: 0; background: #fff; }
  body { display: flex; align-items: center; justify-content: center; height: 120px; }
</style></head>
<body>${markup}</body>
</html>`;
}

/**
 * Кадр эталоном — руками, а не первым прогоном `toHaveScreenshot`.
 *
 * 🔴 Эталон обязан быть кадром **этого** прогона: фикстура доказывает, что
 * сравнение видит разницу между двумя своими кадрами. Файл, оставшийся от
 * прошлого прогона, доказывал бы вместо этого повторяемость отрисовки —
 * другой вопрос, и на другой машине он давал бы ложный отказ.
 */
async function recordBaseline(target: Page, name: string): Promise<void> {
  const frame = await target.screenshot({ animations: 'disabled', caret: 'hide' });
  const path = test.info().snapshotPath(name, { kind: 'screenshot' });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, frame);
}

type Options = { readonly threshold: number; readonly maxDiffPixels: number };

/**
 * Настоящее сравнение Playwright: `null` — кадры сошлись, иначе сообщение
 * отказа. Ждать полного таймаута незачем: страница неподвижна, и кадр второй
 * попытки равен кадру первой.
 */
async function compare(target: Page, name: string, options: Options): Promise<string | null> {
  try {
    await expect(target).toHaveScreenshot(name, {
      animations: 'disabled',
      caret: 'hide',
      timeout: 3_000,
      ...options,
    });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** «123 pixels (ratio 0.01 of all image pixels) are different.» → 123. */
function differingPixels(message: string | null): number {
  if (message === null) return 0;
  const match = /(\d+) pixels \(ratio/.exec(message);
  if (match === null) throw new Error(`сравнение отказало не по точкам:\n${message}`);
  return Number(match[1]);
}

test.describe('порог сравнения кадров', () => {
  for (const fixture of FIXTURES) {
    test(`${fixture.name}: краску границы видит порог кита, но не общий`, async ({ page: p }) => {
      const name = `${fixture.name.replace(/[ ×]/g, '-')}.png`;

      await p.setViewportSize({ width: 200, height: 120 });
      await p.setContent(page(fixture.markup, DANGER_BEFORE));
      await recordBaseline(p, name);

      /* Меняется ровно одно — непрозрачность краски границы, с 45% на 70%.
         Это и есть правка #732, из-за которой заведён issue #801. */
      await p.evaluate(
        (line) => document.documentElement.style.setProperty('--line', line),
        DANGER_AFTER,
      );

      /* Сколько точек сравнение вообще считает расхождением при строгом
         пороге. Число печатается: им калибруется `VR_KIT_SCREENSHOT`. */
      const counted = differingPixels(
        await compare(p, name, { threshold: VR_KIT_SCREENSHOT.threshold, maxDiffPixels: 0 }),
      );
      test.info().annotations.push({
        type: 'точек расхождения',
        description: `${fixture.name}: ${counted} при прямом контуре ${fixture.straight}`,
      });

      expect(
        counted,
        `граница ${fixture.name} обязана набирать больше точек, чем порог кита`,
      ).toBeGreaterThan(VR_KIT_SCREENSHOT.maxDiffPixels);

      /* 🔴 Это утверждение фиксирует дефект, а не желаемое: общий порог правку
         краски не видит вовсе. Ради него у кита и заведён свой. Если однажды
         общий порог тоже станет строгим, тест обязан упасть — и упасть
         осознанно, а не молча пропустить смену смысла. */
      expect(
        await compare(p, name, VR_SCREENSHOT),
        'общий порог правку краски пропускает — ради этого у кита свой',
      ).toBeNull();

      expect(
        await compare(p, name, VR_KIT_SCREENSHOT),
        'порог кита обязан увидеть правку краски границы',
      ).not.toBeNull();
    });
  }

  test('строгий порог не краснеет на неизменённом кадре', async ({ page: p }) => {
    await p.setViewportSize({ width: 200, height: 120 });
    await p.setContent(page(FIXTURES[0]?.markup ?? '', DANGER_BEFORE));
    await recordBaseline(p, 'без-правки.png');

    expect(
      await compare(p, 'без-правки.png', {
        threshold: VR_KIT_SCREENSHOT.threshold,
        maxDiffPixels: 0,
      }),
      'два кадра одной и той же страницы обязаны сойтись точка в точку',
    ).toBeNull();
  });
});
