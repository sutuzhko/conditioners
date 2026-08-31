/**
 * Геометрия линейного графика: чистые функции без React и без DOM (issue #332).
 *
 * 🔴 Вынесены отдельно, потому что это и есть та часть, где ошибка стоит
 * денег: линия, посчитанная не по той шкале, показывает выручку, которой не
 * было. Компонент только рисует то, что здесь посчитано, и покрывается
 * историями; сами числа покрываются тестами.
 */

/** Система координат холста. Пиксели условные: SVG тянется по ширине. */
export const VIEW = { width: 640, height: 220 } as const;

/**
 * Поля холста. Правое большое: на конце каждой линии стоит подпись значения,
 * и без запаса она вылезала бы за край карточки — а вылезать за карточку
 * график не должен (issue #332).
 */
export const PAD = { top: 16, right: 74, bottom: 28, left: 44 } as const;

export interface ChartSeries {
  readonly id: string;
  readonly name: string;
  readonly points: readonly number[];
}

export interface ChartScale {
  readonly min: number;
  readonly max: number;
}

/**
 * Шкала значений по обеим сериям сразу.
 *
 * 🔴 Ноль включается всегда, когда все значения положительные. Шкала, начатая
 * от минимума ряда, превращает разницу в 2% в скачок во весь график — ровно
 * тот приём, за который сайт ругает конкурентов в разделе про обман.
 */
export function scaleOf(series: readonly ChartSeries[]): ChartScale {
  const values = series.flatMap((line) => line.points);
  if (values.length === 0) return { min: 0, max: 1 };

  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  const min = rawMin >= 0 ? 0 : rawMin;

  /* Плоский ряд (все значения равны) дал бы нулевую высоту шкалы и деление на
     ноль: тогда линия ставится посередине холста. */
  return { min, max: rawMax === min ? min + 1 : rawMax };
}

/** Координата точки на холсте. Индекс — по горизонтали, значение — по вертикали. */
export function pointAt(
  index: number,
  value: number,
  count: number,
  scale: ChartScale,
): { readonly x: number; readonly y: number } {
  const usableWidth = VIEW.width - PAD.left - PAD.right;
  const usableHeight = VIEW.height - PAD.top - PAD.bottom;

  /* Единственная точка ставится в начало шкалы, а не в середину: график из
     одной недели должен читаться как «данных на одну неделю», а не как линия. */
  const step = count > 1 ? usableWidth / (count - 1) : 0;
  const ratio = (value - scale.min) / (scale.max - scale.min);

  return {
    x: PAD.left + index * step,
    y: PAD.top + usableHeight - ratio * usableHeight,
  };
}

/** Ломаная по точкам серии. Сглаживания нет: сглаженная линия врёт между точками. */
export function pathOf(points: readonly number[], scale: ChartScale): string {
  return points
    .map((value, index) => {
      const { x, y } = pointAt(index, value, points.length, scale);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Отметки шкалы значений: низ, середина, верх. Трёх довольно — по графику
 * сверяют порядок величины, а точное число читают в подписи конца линии.
 */
export function ticksOf(scale: ChartScale): readonly number[] {
  return [scale.min, (scale.min + scale.max) / 2, scale.max];
}
