'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface TableScrollerProps {
  readonly children: ReactNode;
  readonly className: string;
  /** Имя области прокрутки для озвучки: «Список клиентов». */
  readonly label?: string | undefined;
  readonly maxHeight?: string | undefined;
}

/**
 * Область горизонтальной прокрутки таблицы (issue #602).
 *
 * 🔴 Останов табуляции появляется, только когда прокручивать действительно
 * есть что. Раньше он стоял всегда, и на телефоне, где строки разложены
 * карточками (`overflow-x: visible`), обход клавиатурой упирался в контейнер
 * высотой во весь список: фокус «уходил за окно», потому что элемент выше
 * экрана целиком в него не помещается физически. Пустой останов на
 * непрокручиваемом блоке — не защита от WCAG 2.1.1, а лишний шаг, после
 * которого человек не понимает, где он.
 *
 * 🔴 Роль `region` и имя остаются всегда: по ним область находят сквозные
 * сценарии и озвучка, и они ничего не обещают про клавиатуру. Меняется только
 * останов табуляции — он и есть обещание «сюда можно попасть и прокрутить».
 *
 * Мерится после отрисовки и на каждое изменение размеров: режим карточек
 * включает медиазапрос, и сервер о ширине окна не знает. До первого замера
 * останова нет — это верная сторона отказа: лишний останов хуже пропущенного
 * кадра анимации.
 */
export function TableScroller({ children, className, label, maxHeight }: TableScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return undefined;

    /* Полпикселя — запас на дробную ширину при масштабировании страницы:
       `scrollWidth` округляется, и таблица ровно по контейнеру давала бы
       единицу разницы на некоторых значениях зума. */
    const measure = (): void => setScrollable(node.scrollWidth - node.clientWidth > 1);

    measure();

    /* `ResizeObserver` ловит и смену ширины окна, и перекладку колонок внутри
       самой таблицы. Там, где его нет (jsdom в тестах, старые браузеры),
       остаётся событие окна: оно ловит главный случай — поворот телефона и
       смену режима на карточки. */
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={ref}
      className={className}
      role="region"
      aria-label={label}
      {...(scrollable ? { tabIndex: 0 } : {})}
      style={maxHeight === undefined ? undefined : { maxBlockSize: maxHeight }}
    >
      {children}
    </div>
  );
}
