'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { Icon } from '../Icon';
import styles from './RowMenu.module.css';

export interface RowMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode | undefined;
  readonly onSelect: () => void;
  readonly disabled?: boolean | undefined;
  /** Опасное действие — удаление, отмена наряда: краснеет и стоит последним. */
  readonly danger?: boolean | undefined;
}

export interface RowMenuProps {
  readonly items: readonly RowMenuItem[];
  /** Имя кнопки: «Действия над нарядом № 1059». Без него озвучка молчит. */
  readonly label: string;
  readonly className?: string | undefined;
}

/**
 * Выпадающее меню строки таблицы (issue #332). Четвёртое действие и дальше:
 * три первых стоят круглыми кнопками в колонке действий (`TableActions`).
 *
 * 🔴 Клавиатура по образцу меню ARIA: стрелки ведут по пунктам с переносом по
 * кругу, Home и End прыгают на края, Esc закрывает и возвращает фокус на
 * кнопку, Enter и пробел выбирают. Фокус здесь переезжает в меню — в отличие
 * от автодополнения, где человек продолжает печатать.
 *
 * 🔴 Меню закрывается по клику мимо и по Esc, но не по прокрутке: список
 * панели прокручивается под пальцем, и меню, исчезающее от этого, невозможно
 * открыть на телефоне.
 */
export function RowMenu({ items, label, className }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const onDocumentDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) === true) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onDocumentDown);
    return () => document.removeEventListener('mousedown', onDocumentDown);
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const choose = (item: RowMenuItem) => {
    if (item.disabled === true) return;
    item.onSelect();
    close(true);
  };

  const handleMenuKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + items.length) % items.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActive(items.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = items[active];
      if (item !== undefined) choose(item);
    }
  };

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
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive(0);
          }
        }}
      >
        <span aria-hidden="true" className={styles.dots}>
          <Icon name="burger" size={16} />
        </span>
      </button>

      {open ? (
        /* Меню само принимает фокус и держит его: `tabIndex={-1}` даёт фокус
           программно, не добавляя остановки табуляции. Подсвеченный пункт
           объявляется через `aria-activedescendant`, как в списке подсказок. */
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={styles.menu}
          tabIndex={-1}
          ref={(node) => node?.focus()}
          aria-activedescendant={`${menuId}-${items[active]?.id ?? ''}`}
          onKeyDown={handleMenuKeys}
          onBlur={(event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            setOpen(false);
          }}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              id={`${menuId}-${item.id}`}
              role="menuitem"
              aria-disabled={item.disabled}
              className={[
                styles.item,
                index === active ? styles.active : null,
                item.danger === true ? styles.danger : null,
                item.disabled === true ? styles.itemDisabled : null,
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(item);
              }}
            >
              {item.icon === undefined ? null : (
                <span className={styles.itemIcon} aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
