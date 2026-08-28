import type { ReactNode } from 'react';

import { Card } from '../Card/Card';

import styles from './FormSection.module.css';

/**
 * Во что одет раздел формы.
 *
 * `card` — своя карточка: так раздел стоит в содержимом страницы. `bare` —
 * только поля: рамку даёт тот, кто вставил форму, — окно создания или карточка
 * страницы за тем же адресом (ADR-117). Карточка внутри окна была бы панелью в
 * панели, а её поля отняли бы у полей ввода двадцать пикселей с каждой стороны.
 *
 * 🔴 Раздел остаётся разделом в обоих вариантах: `bare` — это `<section>` без
 * рамки, а не фрагмент. Фрагмент лишает читалку ориентира, а форма без него
 * перестаёт быть отдельной областью страницы.
 */
export type FormSurface = 'card' | 'bare';

/**
 * Уровень заголовка раздела.
 *
 * 🔴 Задаётся снаружи, а не выводится из вида поверхности: уровень зависит от
 * того, что стоит над формой, и знает это только тот, кто её вставил. На
 * странице сверху `h1` — разделы остаются на `h2`; внутри окна `h2` занят
 * названием окна — разделы уходят на `h3` (инвариант 4).
 */
export type FormSectionLevel = 2 | 3;

/** Плотность формы: 14px между разделом и полями либо 12px у плотных форм. */
export type FormSectionGap = 'sm' | 'md';

const HEADINGS = { 2: 'h2', 3: 'h3' } as const;

export interface FormSectionProps {
  /**
   * Заголовок раздела.
   *
   * Обязателен даже когда не показывается: без него у раздела нет доступного
   * имени. Текст приносит сама форма — кит заголовки не сочиняет (ADR-099).
   */
  readonly title: string;
  readonly headingLevel?: FormSectionLevel | undefined;
  readonly surface?: FormSurface | undefined;
  /** Мягкая карточка: раздел, раскрытый внутри другой карточки. */
  readonly tone?: 'default' | 'soft' | undefined;
  readonly hint?: string | undefined;
  /**
   * Заголовок уже стоит снаружи — названием окна или заголовком страницы.
   *
   * Второй раз он не показывается, но остаётся доступным именем раздела: без
   * имени `<section>` не попадает в перечень областей и читалке не виден.
   */
  readonly titleHidden?: boolean | undefined;
  /** Метка рядом с заголовком: состояние самой сущности, а не поле формы. */
  readonly titleAside?: ReactNode | undefined;
  readonly gap?: FormSectionGap | undefined;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

/**
 * Раздел формы: карточка с заголовком либо только поля.
 *
 * 🔴 Живёт в ките, а не в каждой фиче, потому что решение одно на всю панель:
 * форма создания открывается окном, а прямой заход по тому же адресу отдаёт
 * страницу (ADR-117), и обе рисуют одну и ту же форму. Пять копий этого союза
 * успели разойтись в разметке — у одних `bare` был секцией с `h2`, у других с
 * `h3`, у третьих фрагментом без секции вовсе.
 */
export function FormSection({
  title,
  headingLevel = 2,
  surface = 'card',
  tone = 'default',
  hint,
  titleHidden = false,
  titleAside,
  gap = 'md',
  className,
  children,
}: FormSectionProps) {
  const Heading = HEADINGS[headingLevel];

  const body = (
    <>
      {titleHidden ? null : (
        <div className={styles.head}>
          <div className={styles.titleRow}>
            <Heading
              className={[styles.title, headingLevel === 3 ? styles.sub : null]
                .filter(Boolean)
                .join(' ')}
            >
              {title}
            </Heading>
            {titleAside}
          </div>
          {hint === undefined ? null : <p className={styles.hint}>{hint}</p>}
        </div>
      )}

      {children}
    </>
  );

  /* Имя нужно только скрытому заголовку: видимый заголовок читалка объявляет
     сама, и второе имя на секции повторило бы его. */
  const label = titleHidden ? title : undefined;

  const classes = [styles.section, gap === 'sm' ? styles.gapSm : null, className]
    .filter(Boolean)
    .join(' ');

  if (surface === 'bare') {
    return (
      <section className={[classes, styles.bare].join(' ')} aria-label={label}>
        {body}
      </section>
    );
  }

  return (
    <Card
      as="section"
      variant={tone === 'soft' ? 'soft' : 'default'}
      className={classes}
      aria-label={label}
    >
      {body}
    </Card>
  );
}
