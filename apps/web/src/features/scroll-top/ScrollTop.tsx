'use client';

import { useEffect, useState } from 'react';

import { scrollTopContent as t } from './content';
import styles from './ScrollTop.module.css';

/**
 * После скольких экранов кнопка появляется. Один экран — слишком рано: человек
 * ещё видит первый блок и помнит, что был наверху.
 */
const SHOW_AFTER_SCREENS = 2;

/**
 * Кнопка возврата к началу лендинга.
 *
 * 🔴 Появляется только на длинной прокрутке и только тогда, когда наверху ещё
 * что-то есть. Лендинг длинный, и человек, дочитавший до контактов, иначе
 * возвращается к форме заявки колесом через семь секций.
 *
 * Кнопки нет в серверном HTML: она ничего не значит для робота и не должна
 * появляться в разметке страницы до того, как её есть куда нажимать.
 */
export function ScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = (): void => {
      setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const toTop = (): void => {
    /* Плавность — только если её не просили выключить: `scroll-behavior` в
       global.css уважает `prefers-reduced-motion`, а программная прокрутка
       про эту настройку не знает и обязана спросить сама. */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });

    /* 🔴 Фокус переезжает в шапку. Кнопка исчезает, как только страница
       вернулась наверх, и фокус вместе с ней провалился бы в никуда: для
       клавиатуры это значит начать обход страницы заново. */
    const first = document.querySelector<HTMLElement>('header a, header button');
    first?.focus();
  };

  if (!visible) return null;

  return (
    <button type="button" className={styles.button} onClick={toTop} title={t.label}>
      <span className="srOnly">{t.label}</span>
      <svg
        className={styles.icon}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 19V5M5 12l7-7 7 7"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
