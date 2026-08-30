'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * `matchMedia` нет ни на сервере, ни в jsdom, ни в движках постарше. Отсутствие
 * — это не ошибка, а «спросить не у кого»: вызывающий получит `false` и
 * покажет вариант по умолчанию.
 */
function mediaList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(query);
}

/**
 * Совпадает ли медиа-запрос прямо сейчас.
 *
 * 🔴 Через `useSyncExternalStore`, а не через `useState` + эффект: серверный
 * HTML про ширину окна ничего не знает, и первый клиентский рендер обязан
 * совпасть с ним до символа. Хук отвечает `false` на сервере и при первой
 * отрисовке, а настоящий ответ подставляет сразу после гидратации — без
 * расхождения разметки и без кадра с неверным вариантом.
 *
 * 🔴 Нужен там, где ширина меняет не оформление, а состав страницы: элемент,
 * которого на этой ширине быть не должно, спрятанный через `display: none`,
 * всё равно стоит в разметке и продолжает слушать прокрутку.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = mediaList(query);
      if (list === null) return () => undefined;

      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );

  const snapshot = useCallback(() => mediaList(query)?.matches ?? false, [query]);

  return useSyncExternalStore(subscribe, snapshot, () => false);
}
