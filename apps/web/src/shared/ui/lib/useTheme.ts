'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Ключ тот же, что читает инлайн-скрипт в <head> — иначе тема разъедется. */
const STORAGE_KEY = 'tk-theme';

export type Theme = 'light' | 'dark';

/**
 * Источник правды о теме — атрибут `data-theme` на `<html>`: его ставит
 * инлайн-скрипт в `<head>` до первой отрисовки, и он же переживает переходы
 * между страницами. Держать копию в React-состоянии нельзя: переключателей на
 * странице два — в шапке и в выдвижном меню, — и две копии разъезжаются.
 */
function subscribe(onChange: () => void): () => void {
  const watcher = new MutationObserver(onChange);
  watcher.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => watcher.disconnect();
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * 🔴 На сервере темы нет и выдумать её нельзя: серверный HTML один на светлых
 * и тёмных посетителей, и любой выбор здесь — это либо расхождение гидратации,
 * либо мигание после загрузки. Отсюда `undefined`: до маунта состояние честно
 * неизвестно.
 */
function readServerTheme(): undefined {
  return undefined;
}

export interface ThemeControl {
  /** `undefined` — до маунта: серверный HTML темы не знает */
  readonly theme: Theme | undefined;
  readonly setTheme: (next: Theme) => void;
  /** возвращает включённую тему: она нужна вызывающему сразу, а не следующим тактом */
  readonly toggle: () => Theme;
}

/**
 * Чтение и смена темы. Общее для кнопки-переключателя и сегментированной
 * пилюли: обе обязаны говорить одно и то же, а разъезжаются они ровно тогда,
 * когда у каждой своя копия состояния.
 *
 * 🔴 `useSyncExternalStore`, а не `useEffect` + `useState`: компонент,
 * смонтированный уже после гидратации (содержимое выдвижного меню появляется
 * только при открытии), получает актуальную тему в первой же отрисовке. С
 * эффектом первый кадр рисовался бы без выбранного сегмента, и пилюля мигала
 * бы при каждом открытии шторки.
 */
export function useTheme(): ThemeControl {
  const theme = useSyncExternalStore(subscribe, readTheme, readServerTheme);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // приватный режим запрещает запись — тема просто не переживёт перезагрузку
    }
  }, []);

  /* Что переключать, спрашиваем у DOM, а не у снимка состояния: соседний
     переключатель мог сменить тему в этом же кадре. */
  const toggle = useCallback((): Theme => {
    const next: Theme =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
