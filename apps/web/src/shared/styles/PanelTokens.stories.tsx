import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { blend, contrastRatio, formatRatio, parseColor } from '@/shared/lib/color';

import styles from './PanelTokens.module.css';

/**
 * Витрина токенов панели: палитра, плотность, геометрия и тени в обеих темах.
 *
 * 🔴 Значения не переписаны в код витрины, а прочитаны из CSS живого узла.
 * Витрина с собственной копией чисел показывает саму себя: она остаётся
 * зелёной, когда токен уже поехал. Отсюда же `data-ui="panel"` на корне —
 * плотность и геометрия панели живут на её контейнере (ADR-187), и за его
 * пределами этих переменных нет.
 *
 * Контраст считается здесь той же функцией, что в проверке палитры: подпись
 * образца обязана совпадать с тем, что говорит машина, а не с тем, что
 * записали руками полгода назад.
 */

const SURFACES = ['bg', 'bg-soft', 'card', 'field', 'stripe-a', 'stripe-b', 'panel'] as const;
const INKS = ['ink', 'ink2', 'body', 'muted', 'faint', 'accent-text'] as const;
const LINES = ['line-soft', 'line', 'line-strong', 'line-ui'] as const;
const STATES = ['ok', 'warn', 'error', 'info'] as const;
const FILLS = ['error', 'ok'] as const;
const SERIES = ['s1', 's2'] as const;
const HEIGHTS = ['h-sm', 'h-md', 'h-lg', 'h-nav'] as const;
const RADII = ['r-nav', 'r-card', 'r-app', 'r-btn'] as const;
const SHADOWS = ['sh-sm', 'sh-md', 'sh-lg'] as const;

const WATCHED: readonly string[] = [
  ...SURFACES,
  ...INKS,
  ...LINES,
  ...STATES.flatMap((state) => [`${state}-ink`, `${state}-bg`, `${state}-line`]),
  ...FILLS.map((fill) => `on-${fill}`),
  ...SERIES,
  ...HEIGHTS,
  ...RADII,
  ...SHADOWS,
];

type Values = Readonly<Record<string, string>>;

/**
 * Значения токенов с живого узла. Перечитываются при смене темы: переключатель
 * Storybook меняет атрибут на `<html>`, а историю не перерисовывает.
 */
function useTokens(node: HTMLElement | null): Values {
  const [values, setValues] = useState<Values>({});

  useEffect(() => {
    if (node === null) return;

    const read = (): void => {
      const style = getComputedStyle(node);
      setValues(
        Object.fromEntries(
          WATCHED.map((name) => [name, style.getPropertyValue(`--${name}`).trim()]),
        ),
      );
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, [node]);

  return values;
}

/** Контраст пары токенов; `tint` — полупрозрачная подложка между ними. */
function ratioOf(values: Values, ink: string, ground: string, tint?: string): number | null {
  const first = parseColor(values[ink] ?? '');
  const second = parseColor(values[ground] ?? '');
  if (first === null || second === null) return null;

  const layer = tint === undefined ? null : parseColor(values[tint] ?? '');
  const surface = layer === null ? second : blend(layer, second);

  return contrastRatio(first, surface);
}

interface RatioProps {
  readonly value: number | null;
  /** Порог. У декоративной линии его нет — контраст ей не предъявляется. */
  readonly norm?: number;
}

/** Подпись образца: число и порог. Ниже порога — красным, чтобы не искать глазами. */
function Ratio({ value, norm }: RatioProps) {
  if (value === null) return null;
  if (norm === undefined) {
    return <span className={styles.ratio}>{formatRatio(value)}:1 · декоративная</span>;
  }

  const low = value < norm;

  return (
    <span className={low ? `${styles.ratio} ${styles.low}` : styles.ratio}>
      {formatRatio(value)}:1 {low ? `— ниже ${norm}:1` : `· норма ${norm}:1`}
    </span>
  );
}

interface SectionProps {
  readonly caption: string;
  readonly note?: string;
  readonly children: ReactNode;
}

function Section({ caption, note, children }: SectionProps) {
  return (
    <section className={styles.section}>
      <span className={styles.caption}>{caption}</span>
      {note !== undefined && <p className={styles.note}>{note}</p>}
      {children}
    </section>
  );
}

function PanelTokens() {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const attach = useCallback((element: HTMLDivElement | null) => {
    setNode(element);
  }, []);
  const values = useTokens(node);

  return (
    <div className={styles.board} data-ui="panel" ref={attach}>
      <Section
        caption="Поверхности"
        note="На чём всё лежит. Панель — светлый скруглённый контейнер на сером поле; карточка внутри отличается от него границей, а не заливкой."
      >
        <div className={styles.grid}>
          {SURFACES.map((token) => (
            <div className={styles.item} key={token}>
              <div className={styles.swatch} style={{ background: `var(--${token})` }} />
              <div className={styles.meta}>
                <span className={styles.name}>--{token}</span>
                <span className={styles.value}>{values[token]}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        caption="Чернила на карточке"
        note="Пять уровней текста и акцент. Ниже опускаться некуда: следующий уровень не прошёл бы AA."
      >
        <div className={styles.grid}>
          {INKS.map((token) => (
            <div className={styles.item} key={token}>
              <span className={styles.ink} style={{ color: `var(--${token})` }}>
                Заказ № 128
              </span>
              <div className={styles.meta}>
                <span className={styles.name}>--{token}</span>
                <Ratio value={ratioOf(values, token, 'card')} norm={4.5} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        caption="Линии"
        note="Разделителю контраст не нужен, он декоративен. Но там, где линия и есть граница компонента, WCAG 1.4.11 требует 3:1 — и держит его только --line-ui."
      >
        <div className={styles.grid}>
          {LINES.map((token) => (
            <div className={styles.item} key={token}>
              <div className={styles.line} style={{ background: `var(--${token})` }} />
              <div className={styles.meta}>
                <span className={styles.name}>--{token}</span>
                {token === 'line-ui' ? (
                  <Ratio value={ratioOf(values, token, 'card')} norm={3} />
                ) : (
                  <Ratio value={ratioOf(values, token, 'card')} />
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        caption="Краски состояний на своём тинте"
        note="Плашка ложится на подложку, произведённую от той же краски: контраст считается со сложенными слоями, а не по номиналу токена."
      >
        <div className={styles.grid}>
          {STATES.map((state) => (
            <div className={styles.item} key={state}>
              <span
                className={styles.chip}
                style={{
                  background: `var(--${state}-bg)`,
                  borderColor: `var(--${state}-line)`,
                  color: `var(--${state}-ink)`,
                }}
              >
                Статус
              </span>
              <div className={styles.meta}>
                <span className={styles.name}>--{state}-ink</span>
                <Ratio value={ratioOf(values, `${state}-ink`, 'card', `${state}-bg`)} norm={4.5} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        caption="Текст поверх сплошной заливки"
        note="В тёмной теме краски уходят на светлую сторону палитры, и белый на них не читается: поверх заливки идёт фон страницы."
      >
        <div className={styles.grid}>
          {FILLS.map((fill) => (
            <div className={styles.item} key={fill}>
              <span
                className={`${styles.chip} ${styles.solid}`}
                style={{ background: `var(--${fill}-ink)`, color: `var(--on-${fill})` }}
              >
                12 отказов
              </span>
              <div className={styles.meta}>
                <span className={styles.name}>--on-{fill}</span>
                <Ratio value={ratioOf(values, `on-${fill}`, `${fill}-ink`)} norm={4.5} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        caption="Серии графиков"
        note="Одного цвета мало: пара разведена по тону, но не по светлоте. Вторая линия идёт штрихом, у каждой стоит подпись значения на конце, легенда есть всегда. Третья серия не заводится."
      >
        <div className={styles.chart}>
          <svg
            width="240"
            height="72"
            viewBox="0 0 240 72"
            role="img"
            aria-label="Две серии: сплошная и штриховая, у каждой подпись значения на конце"
          >
            <polyline
              points="4,58 44,44 84,48 124,26 164,30 200,12"
              fill="none"
              stroke="var(--s1)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <polyline
              points="4,66 44,60 84,52 124,54 164,40 200,38"
              fill="none"
              stroke="var(--s2)"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
            <text x="206" y="16" fill="var(--s1)" fontSize="11">
              34
            </text>
            <text x="206" y="42" fill="var(--s2)" fontSize="11">
              18
            </text>
          </svg>

          <div className={styles.legend}>
            {SERIES.map((token) => (
              <span className={styles.legendItem} key={token}>
                {/* Образец повторяет линию графика вместе со штрихом: легенда,
                    различающая серии только цветом, воспроизводила бы ровно ту
                    ошибку, от которой штрих и заведён. */}
                <svg width="36" height="6" aria-hidden="true">
                  <line
                    x1="1"
                    y1="3"
                    x2="35"
                    y2="3"
                    stroke={`var(--${token})`}
                    strokeWidth="2"
                    strokeLinecap="round"
                    {...(token === 's2' ? { strokeDasharray: '6 4' } : {})}
                  />
                </svg>
                <span className={styles.name}>--{token}</span>
                <span className={styles.value}>{values[token]}</span>
                <Ratio value={ratioOf(values, token, 'card')} norm={3} />
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section
        caption="Плотность"
        note="Высоты панели: мышиные 32 / 40 / 48 и пункт навигации 44. До 900px они поднимаются до тап-зоны сами — на узком кадре это видно по подписям."
      >
        <div className={styles.bar}>
          {HEIGHTS.map((token) => (
            <span className={styles.control} key={token} style={{ height: `var(--${token})` }}>
              {token} · {values[token]}
            </span>
          ))}
        </div>
      </Section>

      <Section
        caption="Геометрия"
        note="Контейнер прямее, контрол круглее: при одинаковом радиусе кнопка внутри карточки читается её куском."
      >
        <div className={styles.bar}>
          {RADII.map((token) => (
            <span className={styles.radius} key={token}>
              <span className={styles.box} style={{ borderRadius: `var(--${token})` }} />
              <span className={styles.name}>
                --{token} · {values[token]}
              </span>
            </span>
          ))}
        </div>
      </Section>

      <Section caption="Тени" note="Три ступени эталона: тень отделяет слой, а не рисует объём.">
        <div className={styles.grid}>
          {SHADOWS.map((token) => (
            <div className={styles.shadow} key={token} style={{ boxShadow: `var(--${token})` }}>
              --{token}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const meta = {
  title: 'Админка/Токены панели',
  component: PanelTokens,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PanelTokens>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Вся палитра фазы разом: значения, контраст каждой пары и шкала плотности. */
export const Все: Story = {};
