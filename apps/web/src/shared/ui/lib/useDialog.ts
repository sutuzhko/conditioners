'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { useCallback, useEffect } from 'react';

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
 * открывшую кнопку и блокировка прокрутки страницы. Общее для Modal и Drawer —
 * две реализации разошлись бы уже на третьей правке.
 */
export function useDialog({ open, onClose, containerRef }: DialogOptions): DialogHandlers {
  // фокус уводим внутрь окна, а после закрытия возвращаем туда, где он был:
  // иначе человек с клавиатуры окажется в начале страницы
  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement;
    const container = containerRef.current;
    const first = container?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? container)?.focus();

    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, containerRef]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
