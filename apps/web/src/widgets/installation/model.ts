/**
 * Контракт блока «Монтаж».
 *
 * 🔴 Блок в базу не ходит: шаги и таймлайн — статический контент из
 * `content.ts`, всё остальное приходит пропсами (docs/ORCHESTRATION.md,
 * «Блок не ходит в базу»).
 */

/** Шаг пути клиента: «1 · Заявка и консультация». */
export type InstallStep = {
  /** Номер строкой: рисуется как есть, склейки с индексом массива нет. */
  readonly num: string;
  readonly title: string;
  readonly text: string;
};

/** Пункт таймлайна дня монтажа: «09:00 · Приезд и защита». */
export type InstallDayEntry = {
  /** Время в формате `ЧЧ:ММ` — оно же значение атрибута `datetime` у `<time>`. */
  readonly time: string;
  readonly title: string;
  readonly text: string;
};

/**
 * Сетка часов расчёта экономии: сутки размечаются по часам, а не одним
 * ползунком «часов в день». Ночная зона совпадает с границами двухтарифного
 * счётчика: с 23:00 до 07:00.
 */
export const HOURS_IN_DAY = 24;
export const NIGHT_FROM = 23;
export const NIGHT_TO = 7;

/** Как считается электричество: один тариф на сутки или день и ночь отдельно. */
export type TariffMode = 'single' | 'dual';

/**
 * Границы ползунков тарифа, ₽/кВт·ч — из макета.
 *
 * Диапазоны покрывают разброс по стране: от льготного сельского до городского
 * двухтарифного. Стартовые значения — только начальная точка ползунка, а не
 * обещание цены: тариф пересматривают каждый год, поэтому оба переопределяются
 * пропсами блока.
 */
export const TARIFF_DAY_MIN = 3;
export const TARIFF_DAY_MAX = 10;
export const TARIFF_DAY_DEFAULT = 6.5;

export const TARIFF_NIGHT_MIN = 2;
export const TARIFF_NIGHT_MAX = 6;
export const TARIFF_NIGHT_DEFAULT = 3.1;

export const TARIFF_STEP = 0.1;

/** Режим тарифа при первом показе: единый счётчик стоит у большинства. */
export const TARIFF_MODE_DEFAULT: TariffMode = 'single';

/**
 * Часы, отмеченные при первом показе: с полудня до восьми вечера — жаркая
 * половина дня, с которой человеку проще всего сверить свой распорядок.
 */
export const HOURS_DEFAULT: readonly number[] = [12, 13, 14, 15, 16, 17, 18, 19];
