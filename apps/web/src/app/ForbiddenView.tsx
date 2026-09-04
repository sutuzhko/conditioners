'use client';

import { useLayoutEffect } from 'react';

import { ButtonLink } from '@/shared/ui';

import { FORBIDDEN_CONTENT as t } from './forbidden-content';
import styles from './forbidden.module.css';

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
 * Видимая часть страницы отказа.
 *
 * 🔴 Лист клиентский по одной причине — он чинит документ, в котором его
 * показывают. Отказ бросает layout панели: он ждёт сессию из базы, то есть
 * держит каркас ответа, и оборвать его — единственный способ отдать честный
 * 403 (issue #353). Ценой этого Next отдаёт свой служебный документ
 * `html#__next_error__`: в нём нет ни `lang`, ни атрибута темы — их ставит
 * корневой каркас, до которого дело не дошло.
 *
 * Без языка читалка озвучивает русский текст по-английски; без `data-theme`
 * тёмная тема раскрашивается светлыми значениями токенов — страница отказа
 * оказывалась белой у человека с тёмной панелью. Оба атрибута ставятся до
 * первой отрисовки: содержимое всё равно появляется только после гидратации,
 * поэтому мигания нет.
 */
export function ForbiddenView() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.lang === '') root.lang = 'ru';
    if (root.dataset.theme === undefined) root.dataset.theme = preferredTheme();
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <p className={styles.code}>{t.code}</p>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>

        <ButtonLink href={t.workHref} size="lg" className={styles.action}>
          {t.workLink}
        </ButtonLink>
      </div>
    </main>
  );
}
