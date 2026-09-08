'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import styles from './useCopy.module.css';

/** Что произошло с последним копированием. */
type CopyState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'done'; readonly what: string }
  | { readonly kind: 'failed'; readonly what: string; readonly value: string };

export interface CopyControl {
  /**
   * Положить значение в буфер. `what` называет поле («Телефон») — из него
   * собирается и подтверждение, и запасной путь, поэтому это не подпись
   * кнопки, а имя того, что скопировано.
   */
  readonly copy: (value: string, what: string) => void;
  /** Сообщение о результате — его нужно вывести в разметке компонента. */
  readonly status: ReactNode;
}

/** Подтверждение висит ровно столько, сколько нужно, чтобы его заметить. */
const HOLD_MS = 2000;

/**
 * Копирование поля строки одним вызовом (issue #744, ADR-351).
 *
 * ```tsx
 * const { copy, status } = useCopy();
 * …
 * { id: 'phone', label: 'Телефон', onSelect: () => copy(phone, 'Телефон') }
 * …
 * return (<>{status}</>);
 * ```
 *
 * 🔴 Копирование обязано работать и без буфера. `navigator.clipboard`
 * существует только в защищённом контексте: на http-стенде и в старом
 * браузере его нет вовсе, а `writeText` умеет ещё и отказать — в Safari, если
 * между жестом и записью успел вклиниться `await`. Пункт меню, который в этом
 * случае молчит, неотличим от сломанного, и человек нажимает его второй раз.
 * Поэтому отказ не проглатывается: значение показывается строкой, которую
 * можно выделить и скопировать руками.
 *
 * 🔴 Область сообщения живёт всегда, а не появляется вместе с текстом: пустой
 * `aria-live`, вставленный в разметку в момент события, читалки не объявляют
 * (тот же приём, что в `CopyField`).
 *
 * Один хук на все списки панели: клиенты и монтажники обязаны вести себя
 * одинаково, а два своих копирования разошлись бы на первой правке — ровно
 * так уже разъезжались подтверждения, пока их не свёл `useConfirm`
 * (ADR-113).
 */
export function useCopy(): CopyControl {
  const [state, setState] = useState<CopyState>({ kind: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* Таймер снимается при размонтировании: строка живёт в списке, который
     перерисовывается после каждого сохранения. */
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback((value: string, what: string) => {
    clearTimeout(timer.current);

    /* Необязательная цепочка, а не сравнение с `undefined`: по типам
       `navigator.clipboard` всегда есть, и сравнение компилятор считает
       заведомо ложным — а в http-контексте свойства нет. */
    const writing = navigator.clipboard?.writeText(value);

    const fail = (): void => setState({ kind: 'failed', what, value });

    if (writing === undefined) {
      fail();
      return;
    }

    void writing.then(() => {
      setState({ kind: 'done', what });
      timer.current = setTimeout(() => setState({ kind: 'idle' }), HOLD_MS);
    }, fail);
  }, []);

  return {
    copy,
    status: (
      <p className={styles.status} role="status">
        {state.kind === 'done' ? `${state.what} скопирован` : null}
        {state.kind === 'failed' ? (
          <>
            <span className={styles.failed}>Буфер недоступен. {state.what}:</span>{' '}
            {/* Значение выделяемо мышью и не переносится посреди цифр: его
                копируют руками, и разорванный номер сверяют посимвольно. */}
            <span className={styles.value}>{state.value}</span>
          </>
        ) : null}
      </p>
    ),
  };
}
