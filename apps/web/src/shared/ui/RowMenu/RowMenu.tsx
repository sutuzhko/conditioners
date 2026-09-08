'use client';

import Link from 'next/link';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { Icon } from '../Icon';
import { Portal } from '../lib/Portal';
import { useAnchoredLayer, type LayerPlacement } from '../lib/useAnchoredLayer';
import styles from './RowMenu.module.css';

/** Пропсы наследуем у самого Link: маршруты типизированы, и адрес обязан
    проверяться компилятором. */
type NextLinkProps = ComponentProps<typeof Link>;

interface RowMenuItemBase {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode | undefined;
  readonly disabled?: boolean | undefined;
  /** Опасное действие — удаление, отмена наряда: краснеет и стоит последним. */
  readonly danger?: boolean | undefined;
}

/** Пункт, который что-то делает здесь же: удалить, отправить, переключить. */
export interface RowMenuAction extends RowMenuItemBase {
  readonly onSelect: () => void;
}

/**
 * Пункт-переход по маршруту приложения: «Открыть карточку».
 *
 * Настоящая ссылка, а не переход в обработчике: её открывают средней кнопкой
 * и в новой вкладке, и её видит браузер. Тот же выбор, что у
 * `TableActionLink`.
 */
export interface RowMenuLink extends RowMenuItemBase {
  readonly href: NextLinkProps['href'];
}

/**
 * Пункт-переход по адресу, которого маршрутизатор не знает: `tel:`,
 * `mailto:`, карты. Обычный `<a>`, как `TableActionAnchor`.
 *
 * 🔴 Именно ссылка, а не присвоение `location.href` (issue #744). Присвоение
 * уводит со страницы вместо перехода по `tel:`: на рабочем столе, где
 * обработчика `tel:` нет, это выглядит как «ничего не произошло» — а список
 * клиентов открывают именно чтобы позвонить.
 */
export interface RowMenuAnchor extends RowMenuItemBase {
  readonly anchor: string;
}

/**
 * Пункт со вторым уровнем: «Скопировать →» и выбор поля (ADR-351).
 *
 * Второй уровень заменяет содержимое того же меню, а не выезжает сбоку.
 * Выезжающему подменю на 390 некуда деться: меню строки и так прижато к
 * правому краю окна, и второй список ушёл бы за экран. Замена содержимого
 * работает одинаково пальцем, мышью и с клавиатуры и не требует ни второго
 * якоря, ни второго счёта положения.
 */
export interface RowMenuGroup extends RowMenuItemBase {
  readonly items: readonly RowMenuItem[];
}

export type RowMenuItem = RowMenuAction | RowMenuLink | RowMenuAnchor | RowMenuGroup;

export interface RowMenuProps {
  readonly items: readonly RowMenuItem[];
  /** Имя кнопки: «Действия над нарядом № 1059». Без него озвучка молчит. */
  readonly label: string;
  readonly className?: string | undefined;
}

/** Просвет между кнопкой и меню — он же отступ от края окна. */
const GAP = 4;

/**
 * Служебный пункт «Назад» второго уровня. Он стоит первым в списке уровня, а
 * не сбоку от него: пункт, до которого стрелки не доезжают, для клавиатуры
 * не существует, а `role="menuitem"` на нём обещал бы обратное.
 *
 * Идентификатор служебный и в данные раздела не приходит — отсюда двойное
 * подчёркивание.
 */
const BACK: RowMenuAction = {
  id: '__back',
  label: 'Назад',
  /* Левой галочки в ките нет, а заводить сорок первый значок ради зеркала
     сорокового незачем: тот же глиф, отражённый по горизонтали. */
  icon: <Icon className={styles.backIcon} name="chevron-right" size={14} />,
  /* Настоящее действие подставляется при отрисовке уровня: возврат знает про
     состояние, а константа — нет. */
  onSelect: () => undefined,
};

const isGroup = (item: RowMenuItem): item is RowMenuGroup => 'items' in item;
const isAction = (item: RowMenuItem): item is RowMenuAction => 'onSelect' in item;
const isLink = (item: RowMenuItem): item is RowMenuLink => 'href' in item;

/**
 * Выпадающее меню строки таблицы (issue #332). Четвёртое действие и дальше:
 * три первых стоят круглыми кнопками в колонке действий (`TableActions`).
 *
 * 🔴 Клавиатура по образцу меню ARIA: стрелки ведут по пунктам с переносом по
 * кругу, Home и End прыгают на края, Esc закрывает и возвращает фокус на
 * кнопку, Enter и пробел выбирают. Стрелка вправо входит во второй уровень,
 * стрелка влево возвращает из него; Esc на втором уровне тоже возвращает, а
 * закрывает меню только с первого. Фокус здесь переезжает в меню — в отличие
 * от автодополнения, где человек продолжает печатать.
 *
 * 🔴 Меню закрывается по клику мимо и по Esc, но не по прокрутке: список
 * панели прокручивается под пальцем, и меню, исчезающее от этого, невозможно
 * открыть на телефоне. Вместо этого оно едет за своей кнопкой.
 *
 * 🔴 Меню уходит порталом и лежит `position: fixed`, считая координаты от
 * кнопки (issue #573). Раньше оно было `absolute` внутри строки, и это и есть
 * причина, по которой компонент не был позван ни одним экраном: у таблицы
 * панели предок с `overflow-x: auto`, а он по спецификации получает и
 * `overflow-y: auto`, — меню последних строк обрезалось или прокручивало
 * таблицу вниз. Портал снимает заодно и наложение: залипающая ячейка
 * позиционирована и с `z-index` создаёт свой контекст наложения, и меню одной
 * строки уезжало под ячейку следующей, как бы высоко его ни подняли.
 *
 * 🔴 Пункт бывает четырёх видов, и вид определяется полем, а не флагом:
 * `onSelect` — действие, `href` — переход по маршруту, `anchor` — `tel:` и
 * прочие адреса вне маршрутизатора, `items` — второй уровень. Ссылка остаётся
 * настоящей ссылкой в разметке: перехода в обработчике браузер не видит.
 */
export function RowMenu({ items, label, className }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  /* Открытый второй уровень. Хранится сам пункт, а не его номер: список
     пунктов приходит новым объектом на каждую отрисовку строки, и номер
     указывал бы в устаревший массив. */
  const [group, setGroup] = useState<RowMenuGroup | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /* Узлы пунктов: выбор ссылки с клавиатуры нажимает сам узел, чтобы переход
     случился ровно тот же, что от мыши, — со средней кнопкой, целями и
     обработкой схемы `tel:` браузером. */
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const menuId = useId();

  /* Что показывает меню сейчас. На втором уровне первым идёт возврат: он
     такой же пункт, как остальные, и стрелки доезжают до него. */
  const level: readonly RowMenuItem[] = group === null ? items : [BACK, ...group.items];

  useEffect(() => {
    if (!open) return undefined;

    const onDocumentDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) === true) return;
      if (menuRef.current?.contains(event.target) === true) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onDocumentDown);
    return () => document.removeEventListener('mousedown', onDocumentDown);
  }, [open]);

  const measure = useCallback((): LayerPlacement | null => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (button === null || menu === null) return null;

    const rect = button.getBoundingClientRect();
    const height = menu.offsetHeight;
    const below = window.innerHeight - rect.bottom;
    const up = below < height + GAP && rect.top > height + GAP;

    return {
      top: up ? rect.top - GAP - height : rect.bottom + GAP,
      right: Math.max(GAP, window.innerWidth - rect.right),
      /* Вверх или вниз — решение, а не координата: размеры меню от него не
         меняются, и без `data-side` переворот не виден измерениям (#689). */
      side: up ? 'top' : 'bottom',
    };
  }, []);

  /* Слежение за якорем — общее с подсказкой (ADR-328, issue #683): и меню, и
     подсказка обязаны стоять у элемента, к которому привязаны, а формула счёта
     у каждого своя. Координаты хук пишет узлу сам, поэтому `style` у меню
     ниже нет: React, перерисовав меню на стрелке, стёр бы их.

     Смена уровня меняет высоту меню — пересчёт этого не требует: положение
     считается перед каждым кадром, пока меню открыто. */
  useAnchoredLayer({ open, layerRef: menuRef, measure });

  /* Фокус переезжает в меню в том же кадре, в котором оно появилось: до
     отрисовки, иначе кадр без фокуса успевает попасть на экран. */
  useLayoutEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setGroup(null);
    if (returnFocus) buttonRef.current?.focus();
  };

  /** Вернуться со второго уровня на первый, оставив меню открытым. */
  const back = () => {
    setGroup(null);
    setActive(0);
  };

  const choose = (item: RowMenuItem) => {
    if (item.disabled === true) return;

    if (item.id === BACK.id) {
      back();
      return;
    }

    if (isGroup(item)) {
      setGroup(item);
      setActive(0);
      return;
    }

    if (isAction(item)) {
      item.onSelect();
      close(true);
      return;
    }

    /* Ссылка: нажимаем её собственный узел. Программный переход здесь был бы
       вторым способом сделать то же самое — и разошёлся бы с мышью на первой
       же ссылке с целью или схемой, которую обрабатывает система. */
    nodesRef.current.get(item.id)?.click();
    close(false);
  };

  const handleMenuKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (group === null) close(true);
      else back();
      return;
    }

    if (event.key === 'ArrowLeft' && group !== null) {
      event.preventDefault();
      back();
      return;
    }

    if (event.key === 'ArrowRight') {
      const item = level[active];
      if (item !== undefined && isGroup(item)) {
        event.preventDefault();
        choose(item);
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + level.length) % level.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActive(level.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = level[active];
      if (item !== undefined) choose(item);
    }
  };

  /** Общее у всех видов пункта: имя, состояние, подсветка. */
  const itemProps = (item: RowMenuItem, index: number) => ({
    id: `${menuId}-${item.id}`,
    role: 'menuitem',
    'aria-disabled': item.disabled,
    'aria-haspopup': isGroup(item) ? true : undefined,
    className: [
      styles.item,
      index === active ? styles.active : null,
      item.danger === true ? styles.danger : null,
      item.disabled === true ? styles.itemDisabled : null,
    ]
      .filter(Boolean)
      .join(' '),
    onMouseEnter: () => setActive(index),
    ref: (node: HTMLElement | null) => {
      if (node === null) nodesRef.current.delete(item.id);
      else nodesRef.current.set(item.id, node);
    },
  });

  const body = (item: RowMenuItem) => (
    <>
      {item.icon === undefined ? null : (
        <span className={styles.itemIcon} aria-hidden="true">
          {item.icon}
        </span>
      )}
      {item.label}
      {isGroup(item) ? (
        <span className={styles.itemMore} aria-hidden="true">
          <Icon name="chevron-right" size={14} />
        </span>
      ) : null}
    </>
  );

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((current) => !current);
          setGroup(null);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setGroup(null);
            setActive(0);
          }
        }}
      >
        <span aria-hidden="true" className={styles.dots}>
          <Icon name="dots" size={16} />
        </span>
      </button>

      {open ? (
        /* Меню само принимает фокус и держит его: `tabIndex={-1}` даёт фокус
           программно, не добавляя остановки табуляции. Подсвеченный пункт
           объявляется через `aria-activedescendant`, как в списке подсказок.
           По той же причине `tabIndex={-1}` стоит и на пунктах-ссылках: без
           него каждая ссылка стала бы своей остановкой табуляции и разрушила
           бы модель «одна остановка на меню».

           Связь с кнопкой держится идентификатором (`aria-controls`), а не
           вложенностью: в разметке меню теперь лежит в конце body. */
        <Portal>
          <div
            id={menuId}
            role="menu"
            aria-label={group === null ? label : `${group.label}: ${label}`}
            className={styles.menu}
            tabIndex={-1}
            ref={menuRef}
            aria-activedescendant={`${menuId}-${level[active]?.id ?? ''}`}
            onKeyDown={handleMenuKeys}
            onBlur={(event) => {
              if (event.currentTarget.contains(event.relatedTarget)) return;
              setOpen(false);
              setGroup(null);
            }}
          >
            {group === null ? null : (
              /* Заголовок уровня — глазами: озвучке то же самое сообщает имя
                 меню, и второй голос там был бы повтором. */
              <span className={styles.caption} aria-hidden="true">
                {group.label}
              </span>
            )}

            {level.map((item, index) => {
              /* 🔴 Отключённая ссылка рисуется не ссылкой. Атрибута
                 `disabled` у `<a>` нет вовсе: браузер перешёл бы по ней и
                 мимо обработчиков, а `aria-disabled` для него — просто
                 подпись. Пункт без адреса нажать некуда, и это единственный
                 честный способ отключить переход. */
              if (isGroup(item) || isAction(item) || item.disabled === true) {
                return (
                  <div
                    key={item.id}
                    {...itemProps(item, index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(item);
                    }}
                  >
                    {body(item)}
                  </div>
                );
              }

              if (isLink(item)) {
                return (
                  <Link
                    key={item.id}
                    {...itemProps(item, index)}
                    href={item.href}
                    tabIndex={-1}
                    onClick={() => close(false)}
                  >
                    {body(item)}
                  </Link>
                );
              }

              return (
                <a
                  key={item.id}
                  {...itemProps(item, index)}
                  href={item.anchor}
                  tabIndex={-1}
                  onClick={() => close(false)}
                >
                  {body(item)}
                </a>
              );
            })}
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
