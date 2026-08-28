'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface DialogOptions {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
}

export interface DialogHandlers {
  /** вешается на контейнер: Tab не должен уводить фокус за пределы окна */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Поведение модального слоя: Escape, ловушка фокуса, возврат фокуса на
 * открывшую кнопку, блокировка прокрутки страницы и inert для фона. Общее для
 * Modal и Drawer — две реализации разошлись бы уже на третьей правке.
 */
export function useDialog({ open, onClose, containerRef }: DialogOptions): DialogHandlers {
  /*
   * Куда вернуть фокус после закрытия. Хранится в ref, потому что запоминает
   * его один эффект, а возвращает другой — последний в файле (см. ниже).
   */
  const opener = useRef<HTMLElement | null>(null);

  // фокус уводим внутрь окна: иначе человек с клавиатуры остаётся снаружи
  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement;
    opener.current = previous instanceof HTMLElement ? previous : null;

    const container = containerRef.current;
    const first = container?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? container)?.focus();
  }, [open, containerRef]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 🔴 Пока окно открыто, всё вне его помечено inert: ловушка держит только
  // Tab, а виртуальный курсор читалок ходит по всему DOM и без пометки уходил
  // под окно. Помечаем прямых детей body, кроме корня самого портала, и лишь
  // тех, у кого атрибута ещё не было, — чтобы закрытие не «оживило» разметку,
  // которую спрятал кто-то другой.
  useEffect(() => {
    if (!open) return;

    // корень портала — тот предок контейнера, что лежит прямо в body:
    // Portal переносит оверлей в конец body, и сам он остаться живым обязан
    let root = containerRef.current;
    while (root !== null && root.parentElement !== document.body) {
      root = root.parentElement;
    }
    if (root === null) return;

    const portalRoot = root;
    const covered = [...document.body.children].filter(
      (sibling): sibling is HTMLElement =>
        sibling instanceof HTMLElement && sibling !== portalRoot && !sibling.hasAttribute('inert'),
    );
    for (const sibling of covered) sibling.setAttribute('inert', '');

    return () => {
      for (const sibling of covered) sibling.removeAttribute('inert');
    };
  }, [open, containerRef]);

  // страница под окном не должна прокручиваться: на телефоне это главный
  // источник ощущения «скролл уехал куда-то не туда»
  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  /*
   * 🔴 Возврат фокуса стоит последним эффектом сознательно, и переставлять его
   * выше нельзя.
   *
   * React выполняет очистки в порядке объявления эффектов. Пока возврат жил в
   * первом, он срабатывал раньше, чем снималось `inert` с фона, — а `focus()`
   * на элементе внутри `inert`-поддерева браузер молча игнорирует. Окно
   * закрывалось без ошибок, но фокус уходил на `body`, и человек с клавиатуры
   * шёл табом от начала страницы до кнопки, которую только что нажимал. Ловило
   * это только в настоящем браузере: jsdom `inert` не реализует.
   *
   * Запоминание осталось в первом эффекте: он выполняется до того, как фон
   * получает `inert`, а пометка снимает фокус с активного элемента — после неё
   * запоминать было бы уже нечего.
   */
  useEffect(() => {
    if (!open) return;

    return () => {
      opener.current?.focus();
      opener.current = null;
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      if (container === null) return;

      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [containerRef],
  );

  return { onKeyDown };
}
