import Link from 'next/link';
import type { ReactNode } from 'react';

import { STOCK_ITEM_NEW_PATH, stockManagerContent as texts } from '@/features/stock-manager';
import { Icon, buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

export interface StockHeaderProps {
  /**
   * Строка состояния склада под заголовком: «Ниже порога — 2 · всего 15».
   *
   * 🔴 Подстрокой заголовка, а не своим блоком (issue #609): отдельным блоком
   * она стоила зазора страницы и собственной строки — на 320 это место, из
   * которого и складывались 715px до первой позиции.
   *
   * 🔴 Готовый узел, а не строка (issue #651): числа приезжают отдельным
   * куском потока, и на их месте до ответа базы стоит заготовка той же
   * высоты. Подставить туда ноль значит показать неправду до приезда данных,
   * а не показать ничего — сдвинуть ленту вкладок в момент, когда на неё
   * нажимают.
   */
  readonly counts?: ReactNode;
}

/**
 * Шапка раздела. Вынесена в компонент, потому что её рисуют и страница, и
 * витрина: разметка, повторённая руками, расходится с оригиналом на первой
 * же правке (ADR-239).
 *
 * 🔴 На телефоне действие раздела — значок, а не кнопка с подписью (макет 390).
 * Подпись остаётся именем для озвучки: она никуда не девается, просто
 * перестаёт занимать собственную строку под заголовком.
 */
export function StockHeader({ counts }: StockHeaderProps = {}) {
  return (
    <header className={styles.header}>
      <div className={styles.headline}>
        <h1 className={styles.title}>{texts.title}</h1>

        <div className={styles.actions}>
          <Link
            className={`${buttonClassName({ size: 'sm' })} ${styles.add}`}
            href={{ pathname: STOCK_ITEM_NEW_PATH }}
            aria-label={texts.itemAddOpen}
          >
            <Icon name="plus" size={16} />
            <span className={styles.addText}>{texts.itemAddOpen}</span>
          </Link>
        </div>
      </div>

      {counts ?? null}

      <p className={styles.lead}>{texts.lead}</p>
    </header>
  );
}
