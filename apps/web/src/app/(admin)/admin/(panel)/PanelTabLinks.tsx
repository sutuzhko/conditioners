import Link from 'next/link';

import type { PanelTabKeys } from './PanelTabs';
import styles from './PanelTabs.module.css';

export interface PanelTabLinksProps<T extends string> {
  /** Открытая вкладка. У заготовки раздела её нет: адреса `loading.tsx` не знает. */
  readonly active?: T | undefined;
  readonly tabs: PanelTabKeys<T>;
  readonly titleOf: (tab: T) => string;
  readonly label: string;
  /** Куда ведёт вкладка: адрес собирает раздел — он же знает свои фильтры. */
  readonly hrefOf: (tab: T) => {
    readonly pathname: string;
    readonly query?: Record<string, string>;
  };
}

/**
 * Вкладки раздела, за каждой из которых стоит свой запрос к базе.
 *
 * 🔴 Обычные ссылки, а не кнопки: остатки, журнал движений и зоны — три
 * разные выборки, и делать их обязан сервер. Своего JS у переключателя нет
 * вовсе — историю и переход делает браузер (ADR-256, «списки остаются на
 * `<Link>`»).
 *
 * 🔴 Лист серверный, и отдельный файл нужен ровно поэтому. Подпись и адрес
 * вкладки приходят функциями — раздел знает и то и другое, — а функция не
 * переживает границу сервер→клиент: рядом с `'use client'` этот же код падал
 * с «Functions cannot be passed directly to Client Components».
 */
export function PanelTabLinks<T extends string>({
  active,
  tabs,
  titleOf,
  label,
  hrefOf,
}: PanelTabLinksProps<T>) {
  return (
    <nav className={styles.tabs} aria-label={label}>
      {tabs.map((tab) => (
        <Link
          key={tab}
          className={[styles.tab, styles.link, tab === active ? styles.current : null]
            .filter(Boolean)
            .join(' ')}
          href={hrefOf(tab)}
          /* Прокрутка не сбрасывается наверх: вкладки сравнивают, стоя в
             середине списка (ADR-258). */
          scroll={false}
          aria-current={tab === active ? 'page' : undefined}
        >
          {titleOf(tab)}
        </Link>
      ))}
    </nav>
  );
}
