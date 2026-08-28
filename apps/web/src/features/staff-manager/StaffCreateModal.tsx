'use client';

import { useState } from 'react';

import { RouteModal, useRouteClose } from '@/shared/ui';

import { StaffCreateForm } from './StaffCreateForm';
import { staffManagerContent as texts } from './content';
import { TEAM_PATH, type StaffApi } from './model';

export interface StaffCreateModalProps {
  /** Действия раздела. Подменяются в историях и тестах, чтобы не поднимать сеть. */
  readonly api?: StaffApi | undefined;
}

/**
 * Заведение монтажника — окном с собственным адресом (ADR-117).
 *
 * 🔴 Окно, а не форма, разворачивающаяся над списком: выросшая посреди
 * страницы форма уводит карточки вниз ровно тогда, когда на них смотрят, а
 * список команды открывают как раз для того, чтобы позвонить человеку. Само
 * окно — из кита (`RouteModal`), здесь только то, что окно заводит.
 *
 * Правка сюда не попадает: она остаётся страницей карточки — это разные по
 * длительности действия.
 */
export function StaffCreateModal({ api }: StaffCreateModalProps) {
  const close = useRouteClose(TEAM_PATH);

  /**
   * 🔴 Несохранённый ввод — это любое изменение в форме, а не разбор её полей
   * (ADR-141). Ложное срабатывание здесь дешевле пропуска: лишний вопрос стоит
   * одного клика, потерянная форма — второго разговора с человеком.
   */
  const [dirty, setDirty] = useState(false);

  /** Завели — окно уходит само, а список под ним обновляется. */
  const done = (): void => {
    setDirty(false);
    close({ refresh: true });
  };

  return (
    <RouteModal
      title={texts.addTitle}
      description={texts.addHint}
      size="lg"
      fallbackHref={TEAM_PATH}
      dirty={dirty}
    >
      {/* 🔴 Изменённость снимается событием на обёртке, а не полями формы:
          копия правила «чем считать заполненным» разошлась бы с китом на
          первой правке (ADR-141).

          Слушаем `change`, а не `input`. У React `onChange` текстового поля —
          это и есть `input` (событие на каждый символ), а вот у `<select>`
          события разные и приходят по очереди: `input`, затем `change`.
          Пометка изменённости на `input` успевает перерисовать управляемый
          список до `change`, и он возвращается к прежнему значению — первый
          выбор человека пропадал молча. Проверено в браузере на выборе
          оформления монтажника (ADR-144). */}
      <div onChange={() => setDirty(true)}>
        <StaffCreateForm api={api} onCreated={done} />
      </div>
    </RouteModal>
  );
}
