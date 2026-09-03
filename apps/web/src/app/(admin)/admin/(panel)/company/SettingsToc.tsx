'use client';

import type { FocusEvent } from 'react';

import styles from './page.module.css';

export interface SettingsTocProps {
  readonly label: string;
  readonly groups: readonly { readonly key: string; readonly title: string }[];
}

/**
 * Оглавление групп настроек.
 *
 * 🔴 Клиентский лист ради одного обработчика фокуса (issue #337). На телефоне
 * оглавление — лента в одну строку с горизонтальной прокруткой, и Chrome
 * докручивает её к пункту, получившему фокус с клавиатуры, только когда пункт
 * скрыт целиком: наполовину срезанный он считает видимым. Замер на 390:
 * «Координаты на карте» получали фокус на 373–527px при окне в 390 — видны
 * 17px и обрезанное кольцо. Обработчик докручивает ленту до пункта; на
 * широком экране лента не прокручивается, и вызов ничего не двигает.
 */
export function SettingsToc({ label, groups }: SettingsTocProps) {
  const reveal = (event: FocusEvent<HTMLElement>): void => {
    event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <nav className={styles.toc} aria-label={label} onFocus={reveal}>
      {groups.map((group) => (
        <a className={styles.tocLink} key={group.key} href={`#${group.key}`}>
          {group.title}
        </a>
      ))}
    </nav>
  );
}
