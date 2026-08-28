'use client';

import { useState } from 'react';

import { RouteModal, useRouteClose, type RouteClose } from '@/shared/ui';

import { stockManagerContent as texts } from './content';
import { StockItemForm } from './StockItemForm';
import { StockMoveForm } from './StockMoveForm';
import { StockZoneForm } from './StockZoneForm';
import {
  STOCK_PATH,
  STOCK_ZONES_PATH,
  type StockApi,
  type StockItemProduct,
  type StockItemRef,
  type StockMoveDraft,
  type StockZoneCard,
  type StockZonePerson,
} from './model';

/** Что заводит окно. Данные для формы приходят готовыми: их читает страница. */
export type StockCreation =
  | { readonly kind: 'item'; readonly products: readonly StockItemProduct[] }
  | { readonly kind: 'zone'; readonly people: readonly StockZonePerson[] }
  | {
      readonly kind: 'move';
      readonly items: readonly StockItemRef[];
      readonly zones: readonly StockZoneCard[];
      /** Подставленное адресом: позиция и зоны при перетаскивании уже известны. */
      readonly initial: StockMoveDraft;
    };

export interface StockCreateModalProps {
  readonly creation: StockCreation;
  readonly api?: StockApi | undefined;
}

/**
 * Заведение позиции, зоны и движения — окном с собственным адресом (ADR-137).
 *
 * 🔴 Окно, а не форма, разворачивающаяся над списком: выросшая посреди
 * страницы форма уводит таблицу вниз ровно тогда, когда на неё смотрят
 * (ADR-117). Само окно — из кита (`RouteModal`), здесь только то, что окно
 * заводит.
 *
 * Правка сюда не попадает: она остаётся страницей — это разные по длительности
 * действия, и путать их не нужно.
 */
export function StockCreateModal({ creation, api }: StockCreateModalProps) {
  const closeStock = useRouteClose(STOCK_PATH);
  const closeZones = useRouteClose(STOCK_ZONES_PATH);

  /**
   * 🔴 Несохранённый ввод — это любое нажатие в форме. Признак снимается
   * событием, а не полями каждой формы: их три, и три копии «чем считать
   * заполненным» разошлись бы на первой правке. Ложное срабатывание здесь
   * дешевле пропуска: лишний вопрос стоит одного клика, потерянная форма —
   * звонка клиента (ADR-117).
   */
  const [dirty, setDirty] = useState(false);

  /**
   * Сохранили — окно уходит само, а список под ним обновляется.
   *
   * 🔴 Обновление просится у самого закрытия, а не зовётся `router.refresh()`
   * рядом: «назад» это переход, и запрос, начатый до него, роутер отбрасывает.
   * Так здесь и было — позиция заводилась, а строк в таблице не прибавлялось.
   */
  const done = (close: RouteClose): void => {
    setDirty(false);
    close({ refresh: true });
  };

  if (creation.kind === 'item') {
    return (
      <RouteModal
        title={texts.itemAddTitle}
        description={texts.itemAddHint}
        size="lg"
        fallbackHref={STOCK_PATH}
        dirty={dirty}
      >
        <div onChange={() => setDirty(true)}>
          <StockItemForm
            api={api}
            products={creation.products}
            surface="bare"
            onSaved={() => done(closeStock)}
          />
        </div>
      </RouteModal>
    );
  }

  if (creation.kind === 'zone') {
    return (
      <RouteModal
        title={texts.zoneAddTitle}
        description={texts.zoneAddHint}
        fallbackHref={STOCK_ZONES_PATH}
        dirty={dirty}
      >
        <div onChange={() => setDirty(true)}>
          <StockZoneForm
            api={api}
            people={creation.people}
            surface="bare"
            onSaved={() => done(closeZones)}
          />
        </div>
      </RouteModal>
    );
  }

  return (
    <RouteModal
      title={texts.moveTitle}
      description={texts.moveHint}
      size="lg"
      fallbackHref={STOCK_PATH}
      dirty={dirty}
    >
      <div onChange={() => setDirty(true)}>
        <StockMoveForm
          api={api}
          items={creation.items}
          zones={creation.zones}
          initial={creation.initial}
          autoFocusQty
          surface="bare"
          onSaved={() => done(closeStock)}
        />
      </div>
    </RouteModal>
  );
}
