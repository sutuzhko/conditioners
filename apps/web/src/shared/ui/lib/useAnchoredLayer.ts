'use client';

import type { CSSProperties, RefObject } from 'react';
import { useLayoutEffect, useState } from 'react';

export interface AnchoredLayer<A extends Element, L extends Element> {
  /** Открыт ли слой: пока закрыт, ничего не измеряется и никто не подписан. */
  readonly open: boolean;
  /** Элемент, от которого считаются координаты: кнопка строки, цель подсказки. */
  readonly anchorRef: RefObject<A | null>;
  /** Сам всплывающий слой: его размер участвует в счёте и меняет сторону. */
  readonly layerRef: RefObject<L | null>;
  /**
   * Счёт положения — чистая функция от геометрии обоих элементов.
   *
   * 🔴 Обязана быть стабильной (`useCallback`): она стоит в зависимостях
   * подписки, и новая ссылка на каждый кадр пересобирала бы наблюдателей.
   */
  readonly measure: () => CSSProperties | null;
}

/**
 * Положение всплывающего слоя, который едет за своим якорем (ADR-319).
 *
 * Общее у меню строки и подсказки: оба лежат `position: fixed` в портале и
 * считают координаты от элемента, рядом с которым обязаны стоять. Разное —
 * только сама формула, и она остаётся у вызывающего.
 *
 * 🔴 Прокрутки и изменения размера окна недостаточно (issue #660, #665).
 * Раскладка умеет доезжать уже после открытия — подмена шрифта, поздняя
 * картинка, раскрывшийся соседний блок, — и ни одно из этого не даёт ни того,
 * ни другого события. Якорь уезжает, слой остаётся стоять по замеру, снятому
 * до сдвига: в панели это было смещение примерно на 16px вниз и 14px вправо,
 * а в снимках — случайный набор красных кадров на пяти ветках сразу.
 *
 * Поэтому наблюдение идёт за размером якоря и самого слоя: у якоря меняется
 * место, у слоя — высота, а от высоты зависит, раскрыться вниз или вверх.
 *
 * 🔴 Наблюдатель получает снимок элементов, а не живой список. Перебор того,
 * что наблюдатель отдаёт обработчику, и повторная подписка внутри него дают
 * цикл, который не кончается никогда: тест на таком коде съедает всю память.
 *
 * Замер идёт до кадра (`useLayoutEffect`): слой встаёт на место в том же
 * кадре, в котором появился, и не успевает мигнуть не там.
 */
export function useAnchoredLayer<A extends Element, L extends Element>({
  open,
  anchorRef,
  layerRef,
  measure,
}: AnchoredLayer<A, L>): CSSProperties | null {
  /* Пока слой не измерен, координат нет и рисовать его нельзя: кадр в левом
     верхнем углу успевает попасть на экран и читается как поломка. */
  const [at, setAt] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setAt(null);
      return undefined;
    }

    const place = (): void => {
      setAt(measure());
    };

    place();

    /* Прокрутка ловится на фазе погружения: прокручивается не окно, а
       контейнер таблицы, и всплывающего события от него на `window` нет. */
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);

    const watcher = new ResizeObserver(place);
    for (const node of [anchorRef.current, layerRef.current]) {
      if (node !== null) watcher.observe(node);
    }

    /* Шрифт доезжает один раз за загрузку страницы, поэтому это не подписка,
       а одно обещание; `alive` гасит его, если слой успели закрыть. */
    let alive = true;
    void document.fonts.ready.then(() => {
      if (alive) place();
    });

    return () => {
      alive = false;
      watcher.disconnect();
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, measure, anchorRef, layerRef]);

  return at;
}
