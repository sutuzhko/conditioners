'use client';

import { useState, type MouseEvent } from 'react';

/**
 * Органы управления, нажатие на которые само по себе правит форму.
 *
 * 🔴 Не «любой клик»: щелчок по полю, подписи или пустому месту карточки
 * ничего не меняет, а вопрос об уходе, заданный там, где не меняли ничего,
 * перестают читать — и он не срабатывает тогда, когда нужен.
 *
 * `type="submit"` исключён намеренно: отправка — не правка. Форма, которую
 * сервер не принял, остаётся изменённой ровно настолько, насколько в неё
 * успели набрать; пустая форма, отбитая проверкой, терять нечего.
 */
const EDIT_CONTROL = 'button:not([type="submit"]), [role="button"]';

/**
 * Пункт списка выбирается нажатием, а не щелчком: `Autocomplete` закрывает
 * список по `mousedown` (иначе `blur` уносит список раньше, чем до него
 * доходит `click`), и до `click` пункта в дереве уже нет.
 */
const CHOSEN_ON_PRESS = '[role="option"]';

/** Свойства обёртки вокруг формы: разворачиваются на элемент целиком. */
export interface UnsavedInputScope {
  readonly onChange: () => void;
  readonly onClickCapture: (event: MouseEvent<HTMLElement>) => void;
  readonly onMouseDownCapture: (event: MouseEvent<HTMLElement>) => void;
}

export interface UnsavedInput {
  /** В форме есть несохранённый ввод. Отдаётся окну как `dirty`. */
  readonly dirty: boolean;
  /** Сохранили: с этого мгновения терять нечего. */
  readonly markSaved: () => void;
  readonly scope: UnsavedInputScope;
}

/**
 * Признак «в форме есть несохранённый ввод» — одним хуком на все окна
 * создания (ADR-141).
 *
 * 🔴 Изменённость снимается событиями на обёртке, а не полями каждой формы:
 * форм шесть, и шесть копий правила «чем считать заполненным» разошлись бы
 * на первой правке. Ложное срабатывание тут дешевле пропуска: лишний вопрос
 * стоит одного клика, потерянная форма — звонка клиента.
 *
 * 🔴 Событие ввода — `change`, а не `input` (ADR-144). У React `onChange`
 * текстового поля — это и есть `input`, а вот у `<select>` события разные и
 * приходят по очереди: `input`, затем `change`. Пометка изменённости на
 * `input` успевает перерисовать управляемый список до `change`, и он
 * возвращается к прежнему значению — первый выбор человека пропадал молча.
 *
 * 🔴 Одного `change` мало: половина правок в панели делается кнопками, а
 * кнопка события изменения не шлёт (issue #34). Панель разметки в статье
 * вставляет заголовок в текст, «✕» убирает характеристику, «Добавить строку»
 * добавляет пустую — после любой из них форма менялась, а окно закрывалось
 * молча. Поэтому к `change` добавлено нажатие на орган управления: правка
 * кнопкой — это и есть нажатие кнопки.
 *
 * Нажатие ловится в фазе перехвата: обработчик самой кнопки может убрать её
 * из разметки (строку удаляют), и до всплытия события узла уже нет.
 */
export function useUnsavedInput(): UnsavedInput {
  const [dirty, setDirty] = useState(false);

  /* Обработчики не запоминаются: набор свойств всё равно собирается заново на
     каждый рендер, и `useCallback` тут не экономил бы ничего. */
  const markSaved = (): void => {
    setDirty(false);
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(EDIT_CONTROL) === null) return;
    setDirty(true);
  };

  /* Только пункты списка: перерисовка в перехвате `mousedown` у остальных
     органов управления пришлась бы ровно на то место, где ADR-144 уже терял
     выбор в `<select>`. */
  const onMouseDownCapture = (event: MouseEvent<HTMLElement>): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(CHOSEN_ON_PRESS) === null) return;
    setDirty(true);
  };

  return {
    dirty,
    markSaved,
    scope: {
      onChange: () => {
        setDirty(true);
      },
      onClickCapture,
      onMouseDownCapture,
    },
  };
}
