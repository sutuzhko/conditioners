'use client';

import { useLayoutEffect } from 'react';

/** Тот же ключ, что читает инлайн-скрипт в `<head>` корневого каркаса. */
const THEME_KEY = 'tk-theme';

function preferredTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* приватный режим запрещает чтение — спросим систему */
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Чинит служебный документ Next, в котором показываются отказ и «не найдено».
 *
 * 🔴 Страницы, отвечающие 403 и 404, рисуются не в корневом каркасе, а в
 * документе `html#__next_error__`: в нём нет ни `lang`, ни атрибута темы —
 * их ставит каркас, до которого дело не дошло.
 *
 * Без языка читалка озвучивает русский текст по-английски; без `data-theme`
 * тёмная тема раскрашивается светлыми значениями токенов — страница отказа
 * оказывалась белой у человека с тёмной панелью (issue #353), и то же
 * повторилось на 404 панели (issue #631). Починка одна на оба случая: две
 * копии разойдутся на первой правке.
 *
 * Оба атрибута ставятся до первой отрисовки: содержимое всё равно появляется
 * только после гидратации, поэтому мигания нет.
 */
export function ErrorDocumentAttrs(): null {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.lang === '') root.lang = 'ru';
    if (root.dataset.theme === undefined) root.dataset.theme = preferredTheme();
  }, []);

  return null;
}
