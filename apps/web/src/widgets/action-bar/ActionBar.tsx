'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { Contacts } from '@/entities/settings/model';
import { WIDE_SCREEN_QUERY } from '@/shared/config/breakpoints';
import { LEAD_ANCHOR } from '@/shared/config/nav';
import { useMediaQuery } from '@/shared/lib/useMediaQuery';
import type { ButtonLinkHref } from '@/shared/ui';

import { ActionBarView } from './ActionBarView';
import { useCompareOffer } from './compare';
import styles from './ActionBar.module.css';

export interface ActionBarProps {
  readonly contacts: Contacts;
  /**
   * Куда ведёт призыв. По умолчанию — форма на главной: панель стоит в
   * каркасе и живёт на страницах, где своей формы нет, а голый якорь там
   * вёл бы в никуда.
   */
  readonly leadHref?: ButtonLinkHref | undefined;
}

/**
 * Панель действий на странице: правила появления и подключение к отметкам
 * сравнения. Как она выглядит — знает `ActionBarView`.
 *
 * 🔴 Панель существует только ниже 600. С 600 телефон и кнопка заявки видны в
 * шапке, и два места для одного действия соревнуются между собой: побеждает
 * то, которое ближе к пальцу, а проигрывают оба — человек перестаёт понимать,
 * где на этом сайте «позвонить».
 *
 * 🔴 Ширина решается в JavaScript, а не медиа-запросом. Спрятанная через
 * `display: none` панель осталась бы в разметке и продолжала бы слушать
 * пересечения на всех ширинах — работа ради элемента, которого на экране нет.
 */
export function ActionBar({ contacts, leadHref = `/${LEAD_ANCHOR}` }: ActionBarProps) {
  const wide = useMediaQuery(WIDE_SCREEN_QUERY);
  const compare = useCompareOffer();
  const sentinel = useRef<HTMLDivElement | null>(null);
  const [pastFirstScreen, setPastFirstScreen] = useState(false);
  const [leadOnScreen, setLeadOnScreen] = useState(false);

  /* Секцию заявки ищем заново на каждой странице: панель живёт в каркасе и
     переходы между страницами её не размонтируют — найденный однажды узел
     остался бы от предыдущей страницы. */
  const pathname = usePathname();

  useEffect(() => {
    const first = sentinel.current;
    if (first === null || typeof IntersectionObserver !== 'function') return;

    const lead = document.querySelector(LEAD_ANCHOR);

    /* Один наблюдатель на обе метки: браузер считает пересечения пачкой, и
       второй экземпляр стоил бы ровно столько же, сколько первый. */
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === first) setPastFirstScreen(!entry.isIntersecting);
        else setLeadOnScreen(entry.isIntersecting);
      }
    });

    observer.observe(first);
    if (lead !== null) observer.observe(lead);

    /* Страница сменилась — прежний ответ про форму заявки больше ничего не
       значит: на новой странице формы может не быть вовсе. */
    setLeadOnScreen(false);

    return () => observer.disconnect();
  }, [wide, pathname]);

  if (wide) return null;

  /* 🔴 Панель уходит, когда форма заявки в кадре: человек уже на месте, и
     кнопка «Оставить заявку» поверх самой формы закрывает её нижние поля —
     ровно ту часть, до которой он дошёл. */
  const visible = pastFirstScreen && !leadOnScreen;

  return (
    <>
      <div ref={sentinel} className={styles.sentinel} aria-hidden="true" />
      {visible ? (
        <ActionBarView
          contacts={contacts}
          leadHref={leadHref}
          {...(compare === null ? {} : { compare })}
        />
      ) : null}
    </>
  );
}
