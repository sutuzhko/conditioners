'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { stockManagerContent as texts } from './content';
import { stockMovePath } from './model';

/** Взятый остаток: что несём и откуда. */
export type StockGrab = {
  readonly itemId: string;
  readonly itemName: string;
  readonly zoneId: string;
  readonly zoneName: string;
};

export type StockMoveControl = {
  readonly grabbed: StockGrab | null;
  /** Взять остаток ячейки. Повторный вызов на той же ячейке отпускает. */
  readonly take: (grab: StockGrab) => void;
  /** Положить в зону: открывает окно перемещения с подставленными зонами. */
  readonly drop: (zoneId: string, zoneName: string) => void;
  readonly cancel: () => void;
  /** Сказать вслух то, что видно глазами: «в этой зоне пусто». */
  readonly say: (message: string) => void;
  /** Какая ячейка сейчас единственная точка входа с клавиатуры. */
  readonly tabStop: string | null;
  readonly setTabStop: (key: string) => void;
};

const StockMoveContext = createContext<StockMoveControl | null>(null);

/**
 * Состояние перемещения, общее для всех ячеек таблицы.
 *
 * 🔴 Мышь и клавиатура ходят через одно состояние (ADR-137): перетаскивание —
 * ускоритель, а не единственный путь, и раздел обязан работать без единого
 * перетаскивания. Взять ячейку можно и мышью, и Enter'ом; положить — тоже.
 *
 * Само перемещение здесь не проводится: ячейка открывает окно с подставленными
 * позицией и зонами, а количество вводит человек. Молча перекладывать остаток
 * по отпусканию мыши нельзя — промах пальцем стал бы движением в журнале.
 */
export function StockMoveScope({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const [grabbed, setGrabbed] = useState<StockGrab | null>(null);
  const [tabStop, setTabStop] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const take = useCallback((grab: StockGrab): void => {
    setGrabbed(grab);
    setMessage(texts.grabbed(grab.itemName, grab.zoneName));
  }, []);

  const cancel = useCallback((): void => {
    setGrabbed((held) => {
      if (held !== null) setMessage(texts.grabCancelled);
      return null;
    });
  }, []);

  const drop = useCallback(
    (zoneId: string, zoneName: string): void => {
      if (grabbed === null) return;

      setMessage(texts.grabDropped(zoneName));
      setGrabbed(null);
      /* Мягкий переход, а не ссылка: только он рисует окно перехватывающим
         маршрутом — при полной перезагрузке тот же адрес отдаёт страницу. */
      router.push(stockMovePath({ item: grabbed.itemId, from: grabbed.zoneId, to: zoneId }));
    },
    [grabbed, router],
  );

  const say = useCallback((text: string): void => setMessage(text), []);

  const control = useMemo<StockMoveControl>(
    () => ({ grabbed, take, drop, cancel, say, tabStop, setTabStop }),
    [grabbed, take, drop, cancel, say, tabStop],
  );

  return (
    <StockMoveContext.Provider value={control}>
      {children}
      {/* Состояние перетаскивания видно глазами по подсветке ячеек — голосом
          его сообщает эта строка, иначе взятый остаток остаётся тайной. */}
      <p className="srOnly" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </p>
    </StockMoveContext.Provider>
  );
}

/** Управление перемещением. Вне таблицы остатков вызывать нечему. */
export function useStockMove(): StockMoveControl | null {
  return useContext(StockMoveContext);
}
