import type { Page } from '@playwright/test';

import type { InvariantRule, Violation } from './measure';

/**
 * Устойчивость контрольного элемента между состояниями истории (issue #465,
 * ADR-212).
 *
 * 🔴 Полоса итога калькулятора имеет три состояния — сумма, скелетон пересчёта,
 * «считаем на выезде», — и верх кнопки «Вызвать замерщика» обязан стоять на
 * одном месте во всех трёх. Разброс 22px между ними поймали замером в браузере
 * руками; снимок этого не показывает вовсе: он фиксирует одно состояние и на
 * вопрос «двигается ли кнопка, когда меняется соседний блок» не отвечает.
 * Теперь замер делает раннер инвариантов: опорная история объявляет
 * контрольный элемент и id историй-состояний, раннер открывает каждое на той
 * же паре «ширина + тема» и сравнивает рамку элемента с опорной.
 *
 * Чистая часть — разбор параметра и сравнение рамок — без браузера, под
 * vitest; обход состояний — через страницу Playwright, навигацию отдаёт спек:
 * у обхода историй и у самотеста фикстур она своя.
 */

export type ControlBox = {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
};

export type StabilitySpec = {
  /** CSS-селектор контрольного элемента — один и тот же в опорной истории и в состояниях. */
  readonly control: string;
  /** Id историй-состояний из `index.json` витрины. */
  readonly states: readonly string[];
  /** Допуск в пикселях; округление рамки до целых уже съедает доли. */
  readonly tolerance: number;
};

export const STABILITY_RULE: InvariantRule = 'stability';

/** Допуск по умолчанию: один пиксель — граница округления, а не движение. */
export const DEFAULT_TOLERANCE = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStoryIdList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === 'string' && item.length > 0);

/**
 * Разбор `parameters.invariants.stability`. Нет параметра — `null`, история
 * устойчивость не объявляет. 🔴 Кривая форма — громкая ошибка, а не молчаливый
 * пропуск: параметр с опечаткой иначе выглядел бы как проверка, которой нет.
 */
export function parseStability(raw: unknown): StabilitySpec | null {
  if (raw === undefined || raw === null) return null;
  if (!isRecord(raw)) {
    throw new Error('invariants.stability: ожидается объект { control, states, tolerance? }');
  }
  const { control, states, tolerance } = raw;
  if (typeof control !== 'string' || control.trim().length === 0) {
    throw new Error('invariants.stability.control: ожидается CSS-селектор контрольного элемента');
  }
  if (!isStoryIdList(states)) {
    throw new Error('invariants.stability.states: ожидается непустой список id историй-состояний');
  }
  if (tolerance === undefined) {
    return { control: control.trim(), states, tolerance: DEFAULT_TOLERANCE };
  }
  if (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error('invariants.stability.tolerance: ожидается неотрицательное число пикселей');
  }
  return { control: control.trim(), states, tolerance };
}

const SIDES: readonly { readonly key: keyof ControlBox; readonly label: string }[] = [
  { key: 'top', label: 'верх' },
  { key: 'left', label: 'лево' },
  { key: 'width', label: 'ширина' },
  { key: 'height', label: 'высота' },
];

/**
 * Чем рамка в состоянии отличается от опорной — текст для `detail` или `null`,
 * если всё в допуске. Называются только сдвинувшиеся стороны и числа: «верх
 * 412 → 434» читается как факт, а не как впечатление.
 */
export function describeDrift(
  anchor: ControlBox,
  state: ControlBox,
  stateId: string,
  tolerance: number,
): string | null {
  const drifted = SIDES.filter(({ key }) => Math.abs(anchor[key] - state[key]) > tolerance).map(
    ({ key, label }) => `${label} ${anchor[key]} → ${state[key]}`,
  );
  if (drifted.length === 0) return null;
  return `${drifted.join(', ')} в состоянии ${stateId} (допуск ${tolerance}px)`;
}

export function stabilityViolation(
  control: string,
  detail: string,
  allowed: string | null,
): Violation {
  return { rule: STABILITY_RULE, element: control, detail, allowed };
}

/** Параметр устойчивости и допущение этого правила, прочитанные в странице опорной истории. */
export type StabilityParameters = {
  readonly spec: StabilitySpec | null;
  readonly allowed: string | null;
};

export async function readStabilityParameters(page: Page): Promise<StabilityParameters> {
  const raw = await page.evaluate(() => {
    const parameters = window.__STORYBOOK_PREVIEW__?.currentRender?.story?.parameters;
    const invariants = parameters?.invariants;
    if (typeof invariants !== 'object' || invariants === null) {
      return { stability: null, allow: null };
    }
    const allow = Reflect.get(invariants, 'allow');
    return {
      stability: Reflect.get(invariants, 'stability') ?? null,
      allow: Array.isArray(allow) ? allow : null,
    };
  });

  /* Допущение читается тем же правилом, что у измерителя: правило `stability`
     и причина словами; без причины — «причина не названа», и сводка это покажет. */
  let allowed: string | null = null;
  for (const item of raw.allow ?? []) {
    if (!isRecord(item) || item.rule !== STABILITY_RULE) continue;
    allowed =
      typeof item.reason === 'string' && item.reason.trim().length > 0
        ? item.reason.trim()
        : 'причина не названа';
  }

  return { spec: parseStability(raw.stability), allowed };
}

/** Рамка контрольного элемента в координатах документа, округлённая до целых; `null` — элемента нет. */
export function measureControlBox(page: Page, selector: string): Promise<ControlBox | null> {
  return page.evaluate((css) => {
    const el = document.querySelector(css);
    if (el === null) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: Math.round(rect.top + window.scrollY),
      left: Math.round(rect.left + window.scrollX),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }, selector);
}

export type StabilityResult = {
  readonly violations: readonly Violation[];
  /** Контрольный элемент не найден — это отказ проверки, а не «стоит на месте». */
  readonly failures: readonly string[];
};

/**
 * Проверка устойчивости для опорной истории, уже открытой в `page`.
 * `open` — навигация спека к истории-состоянию на той же паре «ширина + тема»
 * с ожиданием готовности; после проверки страница остаётся на последнем
 * состоянии — опорную историю к этому моменту уже замерили.
 */
export async function checkStability(
  page: Page,
  params: StabilityParameters,
  open: (storyId: string) => Promise<void>,
): Promise<StabilityResult> {
  const { spec, allowed } = params;
  if (spec === null) return { violations: [], failures: [] };

  const anchor = await measureControlBox(page, spec.control);
  if (anchor === null) {
    return {
      violations: [],
      failures: [`контрольный элемент «${spec.control}» не найден в опорной истории`],
    };
  }

  const violations: Violation[] = [];
  const failures: string[] = [];
  for (const stateId of spec.states) {
    await open(stateId);
    const box = await measureControlBox(page, spec.control);
    if (box === null) {
      failures.push(`контрольный элемент «${spec.control}» не найден в состоянии ${stateId}`);
      continue;
    }
    const drift = describeDrift(anchor, box, stateId, spec.tolerance);
    if (drift !== null) violations.push(stabilityViolation(spec.control, drift, allowed));
  }

  return { violations, failures };
}
