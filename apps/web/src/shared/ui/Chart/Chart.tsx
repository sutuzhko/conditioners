import styles from './Chart.module.css';
import {
  BAR_RADIUS,
  VIEW,
  bandCenter,
  barAt,
  endLabelsOf,
  padOf,
  pathOf,
  pointAt,
  scaleOf,
  ticksOf,
  type ChartKind,
  type ChartSeries,
} from './geometry';

export type { ChartKind, ChartSeries } from './geometry';

export interface ChartProps {
  /**
   * Ряды. Максимум два — третья серия не заводится (DESIGN_BRIEF §14): две
   * читаются без постоянной сверки с легендой, третья требует другой формы
   * подачи, а не третьего цвета.
   */
  readonly series: readonly [ChartSeries] | readonly [ChartSeries, ChartSeries];
  /** Подписи делений по горизонтали: недели, месяцы. */
  readonly labels: readonly string[];
  /**
   * Имя графика для озвучки. Обязательно и не бывает пустым: `role="img"` без
   * имени озвучка называет «изображение» и не говорит, что показано.
   */
  readonly title: string;
  /**
   * Ломаная или столбцы. Столбцы отвечают на «сколько было в каждую неделю»,
   * ломаная — на «как менялось»; вторую серию столбцы не принимают, потому что
   * две группы столбцов в одной полосе читаются хуже двух линий.
   */
  readonly kind?: ChartKind | undefined;
  /** Как показать число: «128 ₽», «14 шт». Формат задаёт место вызова. */
  readonly format?: ((value: number) => string) | undefined;
  readonly className?: string | undefined;
}

/**
 * График панели: заказы по неделям, выручка и выплаты (issue #332, #589).
 *
 * 🔴 Инлайновый SVG, отрисованный на сервере. Клиентского JS ноль — это важно
 * при запасе бюджета в 0,3 КБ (ADR-184): библиотека графиков стоит десятки
 * килобайт и уходит в бандл целиком ради одной картинки на одном экране.
 * Столбцы добавлены тем же способом и не стоят ни байта.
 *
 * 🔴 Вторая серия различается штрихом, а не только цветом. Пара `--s1`/`--s2`
 * разведена по тону, но не по светлоте — 1,36:1 в светлой теме и 1,08:1 в
 * тёмной; при нарушениях цветовосприятия и на чёрно-белой печати наряда серии
 * сольются. Поэтому вторая линия идёт `stroke-dasharray`, у каждой стоит
 * подпись значения на конце, а легенда присутствует всегда, когда серий две.
 *
 * 🔴 `aria-label` называет, что показано и какие числа, а не «график». Пустой
 * или общий текст здесь равен отсутствию графика для того, кто его не видит.
 *
 * 🔴 Подписи концов линий разводит `endLabelsOf` (issue #666): при равных
 * величинах — а ноль и ноль это состояние любого нового бизнеса — обе вставали
 * в одну точку и рисовались друг поверх друга.
 */
export function Chart({
  series,
  labels,
  title,
  kind = 'line',
  format = String,
  className,
}: ChartProps) {
  const scale = scaleOf(series);
  const ticks = ticksOf(scale);
  const pad = padOf(kind);
  const bars = kind === 'bars';

  /* Подписи считаются по всем сериям разом: где встанет вторая, зависит от
     того, где стоит первая (issue #666). Столбцам подписи концов не положены
     вовсе — число каждого читается по шкале. */
  const endLabels = bars ? [] : endLabelsOf(series, scale, pad);

  /* Описание для озвучки собирается из тех же чисел, что нарисованы: расхождение
     разметки и картинки — это разные данные для зрячего и незрячего. */
  const description = series
    .map((line) => {
      const last = line.points[line.points.length - 1];
      const first = line.points[0];
      if (last === undefined || first === undefined) return `${line.name}: данных нет`;

      return `${line.name}: от ${format(first)} до ${format(last)}`;
    })
    .join('; ');

  return (
    <figure className={[styles.figure, className].filter(Boolean).join(' ')}>
      {series.length > 1 ? (
        <figcaption className={styles.legend}>
          {series.map((line, index) => (
            <span key={line.id} className={styles.legendItem}>
              <span
                className={[styles.swatch, index === 0 ? styles.swatch1 : styles.swatch2].join(' ')}
                aria-hidden="true"
              />
              {line.name}
            </span>
          ))}
        </figcaption>
      ) : null}

      {/* 🔴 `preserveAspectRatio` вместе с `width: 100%` из модуля: график
          тянется по ширине карточки и никогда за неё не выходит. Высота
          следует из `viewBox`, поэтому резерв места известен до отрисовки и
          вёрстка не прыгает. */}
      <svg
        className={styles.canvas}
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${title}. ${description}`}
      >
        {ticks.map((tick) => {
          const { y } = pointAt(0, tick, labels.length, scale, pad);
          return (
            <g key={tick}>
              <line
                className={styles.grid}
                x1={pad.left}
                x2={VIEW.width - pad.right}
                y1={y}
                y2={y}
              />
              <text className={styles.tick} x={pad.left - 8} y={y + 4} textAnchor="end">
                {format(Math.round(tick))}
              </text>
            </g>
          );
        })}

        {labels.map((label, index) => {
          /* У столбцов подпись стоит под центром полосы, у ломаной — под
             точкой: точка живёт на краю холста, полоса — между краями. */
          const x = bars
            ? bandCenter(index, labels.length, pad)
            : pointAt(index, scale.min, labels.length, scale, pad).x;

          return (
            <text
              key={label}
              className={styles.tick}
              x={x}
              y={VIEW.height - pad.bottom + 18}
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}

        {bars
          ? series[0].points.map((value, index) => {
              const rect = barAt(index, value, series[0].points.length, scale, pad);
              return (
                <rect
                  className={styles.bar}
                  key={labels[index] ?? index}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  rx={BAR_RADIUS}
                />
              );
            })
          : series.map((line, index) => {
              const last = line.points[line.points.length - 1];
              const end =
                last === undefined
                  ? undefined
                  : pointAt(line.points.length - 1, last, line.points.length, scale, pad);

              return (
                <g key={line.id}>
                  <path
                    className={[styles.line, index === 0 ? styles.line1 : styles.line2].join(' ')}
                    d={pathOf(line.points, scale, pad)}
                  />
                  {/* 🔴 Точка остаётся у своего конца линии, даже когда подпись
                      от неё отъехала: точка — это и есть последнее измерение,
                      и двигать её значило бы двигать данные. */}
                  {end === undefined ? null : (
                    <circle
                      className={[styles.dot, index === 0 ? styles.dot1 : styles.dot2].join(' ')}
                      cx={end.x}
                      cy={end.y}
                      r={3.5}
                    />
                  )}
                </g>
              );
            })}

        {/* Подписи значений — последним слоем, поверх линий: число читают, а
            не угадывают из-под штриха. Она и есть точное значение, график же
            показывает только форму. */}
        {endLabels.map((label) => (
          <text
            key={label.index}
            className={[
              styles.value,
              label.shared ? styles.valueShared : label.index === 0 ? styles.value1 : styles.value2,
            ].join(' ')}
            x={label.x + 8}
            y={label.y + 4}
          >
            {format(label.value)}
          </text>
        ))}
      </svg>
    </figure>
  );
}
