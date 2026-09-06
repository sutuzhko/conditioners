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
  pad: ChartPad = PAD,
): { readonly x: number; readonly y: number } {
  const usableWidth = VIEW.width - pad.left - pad.right;
  const usableHeight = VIEW.height - pad.top - pad.bottom;

  /* Единственная точка ставится в начало шкалы, а не в середину: график из
     одной недели должен читаться как «данных на одну неделю», а не как линия. */
  const step = count > 1 ? usableWidth / (count - 1) : 0;
  const ratio = (value - scale.min) / (scale.max - scale.min);

  return {
    x: pad.left + index * step,
    y: pad.top + usableHeight - ratio * usableHeight,
  };
}

/** Ломаная по точкам серии. Сглаживания нет: сглаженная линия врёт между точками. */
export function pathOf(points: readonly number[], scale: ChartScale, pad: ChartPad = PAD): string {
  return points
    .map((value, index) => {
      const { x, y } = pointAt(index, value, points.length, scale, pad);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Отметки шкалы значений: низ, середина, верх. Трёх довольно — по графику
 * сверяют порядок величины, а точное число читают в подписи конца линии.
 */
export function ticksOf(scale: ChartScale): readonly number[] {
  const middle = (scale.min + scale.max) / 2;

  /* 🔴 Середина отбрасывается, если её подпись совпала с краем. Подпись
     отметки округляется до целого, а сама отметка стоит там, где стоит: на
     шкале 0…1 середина 0,5 подписывалась единицей — на графике оказывались
     две единицы, и линия сетки врала про своё значение. Так выглядели
     «Заказы по неделям», пока недельный максимум был равен одному. */
  const edges = [Math.round(scale.min), Math.round(scale.max)];
  if (edges.includes(Math.round(middle))) return [scale.min, scale.max];

  return [scale.min, middle, scale.max];
}

/**
 * Высота строки подписи значения. Кегль подписи 12px (`.value` в
 * `Chart.module.css`), высота строки — он же с небольшим просветом: две
 * подписи, разведённые ровно на это число, стоят вплотную и не наезжают.
 */
export const VALUE_LINE = 14;

/** Подпись значения на конце линии. */
export interface EndLabel {
  /** Индекс серии: по нему берётся цвет линии. */
  readonly index: number;
  readonly x: number;
  readonly y: number;
  /** Значение, которое подписано. Форматирует его место вызова. */
  readonly value: number;
  /**
   * Подпись стоит за обе линии сразу: их значения совпали (issue #666).
   * Рисуется нейтральным цветом — своего у неё быть не может, а цвет одной из
   * линий соврал бы про вторую. Какая где, говорит легенда рядом.
   */
  readonly shared: boolean;
}

/**
 * Где рисовать подписи концов линий — issue #666.
 *
 * 🔴 Ноль и ноль — не крайний случай, а состояние любого нового бизнеса до
 * первого закрытого наряда: владелец видит его на первом же входе в панель.
 * Обе подписи вставали в одну точку и рисовались друг поверх друга — вместо
 * двух чисел на экране оставалась каша.
 *
 * Правил два, и они разные по существу:
 *
 * 1. **Значения равны** — подпись одна на две линии. Второе такое же число
 *    рядом ничего не добавляет, а легенда и так говорит, какая линия какая.
 * 2. **Значения разные, но подписи наезжают** — вторая уходит на высоту
 *    строки от первой. Показать одно число вместо двух здесь нельзя: 100 и 99
 *    — это два разных числа, и одно на их месте было бы неправдой.
 *
 * Двигается всегда вторая: первая стоит у своего конца линии, и читатель
 * находит её там, где ждёт. Сдвиг идёт в сторону от первой и упирается в поля
 * холста — подпись, уехавшая за край, обрезается краем SVG.
 */
export function endLabelsOf(
  series: readonly ChartSeries[],
  scale: ChartScale,
  pad: ChartPad = PAD,
): readonly EndLabel[] {
  const ends: readonly (EndLabel | null)[] = series.map((line, index) => {
    const value = line.points[line.points.length - 1];
    if (value === undefined) return null;

    const { x, y } = pointAt(line.points.length - 1, value, line.points.length, scale, pad);

    return { index, x, y, value, shared: false };
  });

  const drawn = ends.filter((label): label is EndLabel => label !== null);

  /* Разводить нечего: подпись одна или её нет вовсе. Серий больше двух не
     бывает по типу `ChartProps`, поэтому пар тоже ровно одна. */
  const [first, second] = drawn;
  if (first === undefined || second === undefined) return drawn;

  /* Одно число на две линии: второй подписи просто нет. */
  if (first.value === second.value) return [{ ...first, shared: true }];

  if (Math.abs(second.y - first.y) >= VALUE_LINE) return drawn;

  /* 🔴 Сдвиг в сторону от первой подписи, а не всегда вниз: у линии, которая
     идёт выше, подпись обязана остаться выше — иначе разведённые подписи
     поменяются местами относительно своих линий и соврут сильнее, чем
     наложение. Равные `y` при разных значениях даёт округление шкалы; такая
     пара разводится вниз, и это единственный произвольный выбор здесь. */
  const shifted = second.y < first.y ? first.y - VALUE_LINE : first.y + VALUE_LINE;
  const inside = Math.min(Math.max(shifted, pad.top), VIEW.height - pad.bottom);

  return [first, { ...second, y: inside }];
}

/**
 * Род графика: ломаная или столбцы (issue #589).
 *
 * Столбцы отвечают на вопрос «сколько было в каждую неделю», ломаная — «как
 * менялось». Разные вопросы, но одна шкала, одна сетка и одни подписи, поэтому
 * это проп одного компонента, а не второй компонент рядом.
 */
export type ChartKind = 'line' | 'bars';

export interface ChartPad {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/**
 * Поля холста столбцов. Правое маленькое: подписи значения на конце у
 * столбцов нет — число каждого читается по шкале, — и запас в 74px забирал бы
 * восьмую часть ширины ни на что.
 */
export const BARS_PAD: ChartPad = { top: 16, right: 12, bottom: 28, left: 44 };

export function padOf(kind: ChartKind): ChartPad {
  return kind === 'bars' ? BARS_PAD : PAD;
}

/**
 * Доля полосы, которую занимает сам столбец. Снята с макета «Обзор»: столбец
 * 19,9 при шаге 43,2 — 46%. Промежуток между столбцами шире самого промежутка
 * между делениями ломаной намеренно: столбцы обязаны читаться поштучно.
 */
const BAR_RATIO = 0.46;

/** Скругление столбца. Из макета «Обзор»: `rx="4"`. */
export const BAR_RADIUS = 4;

export interface ChartBar {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Прямоугольник столбца: полоса делится поровну, столбец стоит по её центру.
 *
 * 🔴 Полосами, а не точками, как у ломаной. Точка стоит на краю холста —
 * первая у левого поля, последняя у правого, — и столбец, поставленный на
 * точку, наполовину вылезал бы за сетку с обеих сторон.
 *
 * Нулевое значение даёт нулевую высоту, а не полоску-минимум: пририсованный
 * столбик там, где заказов не было, — это цифра, которой не было.
 */
export function barAt(
  index: number,
  value: number,
  count: number,
  scale: ChartScale,
  pad: ChartPad = BARS_PAD,
): ChartBar {
  const usableWidth = VIEW.width - pad.left - pad.right;
  const usableHeight = VIEW.height - pad.top - pad.bottom;

  const band = count > 0 ? usableWidth / count : usableWidth;
  const width = band * BAR_RATIO;
  const ratio = (value - scale.min) / (scale.max - scale.min);
  const height = Math.max(ratio * usableHeight, 0);

  return {
    x: pad.left + band * index + (band - width) / 2,
    y: pad.top + usableHeight - height,
    width,
    height,
  };
}

/** Центр полосы: там же стоит подпись деления под столбцом. */
export function bandCenter(index: number, count: number, pad: ChartPad = BARS_PAD): number {
  const usableWidth = VIEW.width - pad.left - pad.right;
  const band = count > 0 ? usableWidth / count : usableWidth;
  return pad.left + band * (index + 0.5);
}
