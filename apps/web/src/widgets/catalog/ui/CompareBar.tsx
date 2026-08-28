import Link from 'next/link';

import { ButtonLink, type ButtonLinkHref } from '@/shared/ui';

import { catalogListText as t } from '../content';
import { COMPARE_ANCHOR } from '../model';
import styles from './CompareBar.module.css';

export interface CompareBarProps {
  /** Сколько моделей отмечено. Ноль — строки нет вовсе. */
  readonly count: number;
  /** Адрес страницы сравнения с этими же отметками. */
  readonly compareHref: ButtonLinkHref;
  /** Тот же каталог без отметок: подбор, порядок и страница остаются. */
  readonly clearHref: ButtonLinkHref;
}

/**
 * Строка сравнения в каталоге: «отмечено N · Сравнить · Очистить» (ADR-121).
 *
 * 🔴 Здесь нет таблицы и не может быть: она уехала на `/compare`. Отметка
 * раньше разворачивала таблицу над сеткой, и товар, ради которого человек
 * нажимал, уходил из поля зрения. Теперь отметка меняет счётчик в строке —
 * прыжок содержимого исчезает как класс.
 *
 * Строка несёт якорь `#compare`: отметка сделана ссылкой (ADR-109), и без
 * якоря нажатие в середине списка возвращало бы человека в начало страницы.
 * Сразу под строкой начинается сетка — приземление показывает товар.
 *
 * Ничего не отмечено — строки нет: пустой счётчик над витриной это шум, а
 * приглашение к сравнению живёт на самой карточке отметкой «Сравнить».
 */
export function CompareBar({ count, compareHref, clearHref }: CompareBarProps) {
  if (count === 0) return null;

  return (
    <div id={COMPARE_ANCHOR} className={styles.bar}>
      <p className={styles.count}>{t.compareCount(count)}</p>

      <ButtonLink href={compareHref} variant="secondary" size="sm" className={styles.open}>
        {t.compareOpen}
      </ButtonLink>

      {/* Видимая подпись короткая, доступное имя — полное: «Очистить» на
          странице с подбором двусмысленно, а полное имя целиком содержит
          видимое (WCAG 2.5.3). */}
      <Link className={styles.clear} href={clearHref} aria-label={t.compareClearFull}>
        {t.compareClear}
      </Link>
    </div>
  );
}
