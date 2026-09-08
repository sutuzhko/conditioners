'use client';

import { useEffect, useRef } from 'react';

import type { Confirm, ConfirmRequest } from '../ConfirmDialog/model';

export interface LeaveGuardOptions {
  /** Терять есть что: пока `false`, слушателей нет вовсе. */
  readonly when: boolean;
  /** Окно вопроса. Берётся у `useConfirm` раздела — второго окна не заводим. */
  readonly confirm: Confirm;
  /** Подписи вопроса: тексты — забота раздела, кит их не сочиняет. */
  readonly request: ConfirmRequest;
}

/**
 * Уход со страницы, на которой есть несохранённые правки (issue #32).
 *
 * 🔴 Уходов два, и они устроены по-разному. Переход по ссылке внутри панели —
 * это клик, который перехватывает маршрутизатор; закрытие вкладки и
 * перезагрузка — `beforeunload`, и там браузер показывает **своё** окно,
 * текст которого задать нельзя. Одинаковыми их не сделать; одинаковы они по
 * смыслу: ни один не уносит набранное молча.
 *
 * 🔴 Ссылка не открывается программно, а нажимается второй раз. Своё
 * `router.push(href)` потребовало бы привести строку из разметки к типу
 * маршрута — то есть `as`, который в проекте запрещён, и заодно объехало бы
 * `Link`: предзагрузку, `scroll`, `replace`. Поэтому подтверждённая ссылка
 * помечается и нажимается ещё раз, а перехват её пропускает.
 *
 * Кнопка «назад» браузера сюда не входит: перехватить её можно только подменой
 * истории, а подменённая история ломает сам «назад» — цена выше пропажи.
 * Уход по ссылке и закрытие вкладки закрывают то, чем панель пользуются.
 */
export function useLeaveGuard({ when, confirm, request }: LeaveGuardOptions): void {
  /* Подписи и само окно меняются каждым рендером, а слушатели переставляются
     только когда меняется «есть что терять»: снимать и вешать их на каждый
     введённый символ незачем. */
  const latest = useRef({ confirm, request });
  useEffect(() => {
    latest.current = { confirm, request };
  });

  /* Ссылка, которую человек уже согласился открыть: её нажатие пропускается
     без вопроса. Ref, а не состояние: перерисовка тут ничего не меняет, а
     между перехватом и повторным нажатием проходит один клик. */
  const allowed = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!when) return;

    const warn = (event: BeforeUnloadEvent): void => {
      /* Текст задать нельзя: браузер показывает своё окно своими словами. */
      event.preventDefault();
    };

    const intercept = (event: MouseEvent): void => {
      if (event.defaultPrevented || event.button !== 0) return;
      /* Ctrl, Shift и средняя кнопка открывают ссылку рядом, а не уводят с
         формы: терять там нечего. */
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest('a');
      if (!(link instanceof HTMLAnchorElement) || link.getAttribute('href') === null) return;

      if (allowed.current === link) {
        allowed.current = null;
        return;
      }

      if (link.target !== '' && link.target !== '_self') return;
      if (link.hasAttribute('download')) return;
      /* Чужой адрес, `tel:` и `mailto:` уводят из вкладки, а не со страницы:
         вкладку с формой закрывает уже `beforeunload`. */
      if (link.origin !== window.location.origin) return;
      /* Якорь той же страницы — не уход. Оглавление групп на форме компании
         состоит ровно из таких ссылок, и вопрос на каждую из них научил бы
         отвечать «уйти» не читая. */
      if (link.pathname === window.location.pathname && link.search === window.location.search) {
        return;
      }

      /* Перехват идёт в фазе погружения, поэтому обработчик самой ссылки ещё
         не отработал: остановленное здесь событие до `Link` не доходит. */
      event.preventDefault();
      event.stopPropagation();

      void latest.current.confirm(latest.current.request).then((confirmed) => {
        if (!confirmed) return;
        allowed.current = link;
        link.click();
      });
    };

    window.addEventListener('beforeunload', warn);
    /* Слушатель на документе, а не на форме: ссылки навигации лежат снаружи
       формы — в оболочке панели. */
    document.addEventListener('click', intercept, true);

    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', intercept, true);
    };
  }, [when]);
}
