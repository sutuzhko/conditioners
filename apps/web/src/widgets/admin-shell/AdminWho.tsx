'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { Icon } from '@/shared/ui';

import { LogoutButton } from './LogoutButton';
import { adminShellContent as texts, navHrefOf, type AdminSection } from './content';
import styles from './AdminNav.module.css';

export type AdminWhoProps = {
  /** Кто вошёл: имя из профиля, иначе логин. Из сессии, не из кода (инвариант 8). */
  readonly name: string;
  /** Подпись роли: панель у владельца и у монтажника выглядит по-разному. */
  readonly roleTitle: string;
  /** Разделы прибитого низа: те же, что открываются из меню. */
  readonly sections: readonly AdminSection[];
};

/** Инициалы для кружка: две первых буквы имени и фамилии, иначе одна. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part.slice(0, 1).toUpperCase()).join('');
}

/**
 * Карточка вошедшего в верху колонки: инициалы, имя, роль и меню (ADR-309).
 *
 * 🔴 Меню повторяет прибитый низ колонки, и это не недосмотр. В рельсе от низа
 * остаются три безымянных значка, а карточка сжимается до кружка — меню
 * оказывается единственным местом, где «Настройки», «Профиль» и «Выйти»
 * названы словами. На широком экране повтор виден, но так устроен любой
 * аккаунт-меню: человек ищет выход там, где нарисовано, кто он.
 *
 * 🔴 Раскрывающийся блок, а не меню ARIA. Внутри ссылки: их открывают средней
 * кнопкой, копируют адрес и обходят табом — `role="menu"` отнял бы у них
 * ровно это, потребовав взамен стрелочной навигации, которой у ссылок нет.
 */
export function AdminWho({ name, roleTitle, sections }: AdminWhoProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const pathname = usePathname();

  /* Переход по ссылке меню не размонтирует оболочку: без этого меню осталось
     бы висеть поверх уже открытого раздела. */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const onDocumentDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) === true) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onDocumentDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentDown);
    };
  }, [open]);

  return (
    <div
      className={styles.who}
      ref={rootRef}
      /* Esc закрывает и возвращает фокус на карточку: иначе он остаётся на
         ссылке, которой больше нет в дереве, и уезжает в начало страницы. */
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.whoButton}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initialsOf(name)}
        </span>

        {/* 🔴 Имя и роль уходят из виду в рельсе, но не из разметки: они и есть
            имя кнопки, и `display: none` оставил бы карточку безымянной. */}
        <span className={styles.whoText}>
          <span className={styles.whoName}>{name}</span>
          <span className={styles.whoRole}>{roleTitle}</span>
        </span>

        <Icon className={styles.chevron} name="chevron" size={16} />
      </button>

      {open ? (
        <nav className={styles.menu} id={menuId} aria-label={texts.accountMenuLabel}>
          <ul className={styles.menuList}>
            {sections.map((section) => (
              <li key={section.href}>
                <Link
                  className={styles.menuItem}
                  href={{ pathname: section.href }}
                  /* 🔴 Подсветка уехала сюда вместе с пунктами: на
                     `/admin/company` иначе ничто не говорит, что открыты
                     «Настройки» — раньше это показывал прибитый низ. */
                  aria-current={section.href === navHrefOf(pathname) ? 'page' : undefined}
                >
                  <Icon className={styles.menuIcon} name={section.icon} />
                  {section.title}
                </Link>
              </li>
            ))}

            <li>
              <Link
                className={styles.menuItem}
                href={{ pathname: '/' }}
                target="_blank"
                rel="noreferrer"
              >
                <Icon className={styles.menuIcon} name="conditioner" />
                {texts.site}
              </Link>
            </li>

            <li>
              <LogoutButton className={styles.menuItem} iconClassName={styles.menuIcon} />
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
