'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';

import type { AdminRole } from '@/entities/staff/model';
import { Drawer, Icon } from '@/shared/ui';

import { LogoutButton } from './LogoutButton';
import {
  ADMIN_GROUP_TITLES,
  ADMIN_TABS,
  adminShellContent as texts,
  bottomSectionsFor,
  columnSectionsFor,
  navHrefOf,
  type AdminSection,
} from './content';
import styles from './AdminTabs.module.css';

export type AdminTabsProps = {
  readonly role: AdminRole;
};

/**
 * Навигация панели на телефоне: пять вкладок внизу экрана.
 *
 * До 600px колонка не показывается вовсе — тринадцать разделов не помещаются
 * в неё ни столбцом, ни лентой: лента укладывала их в строку, по которой
 * приходилось листать вслепую. Внизу стоят четыре раздела и «Ещё», за
 * которым лежат остальные вместе с настройками, профилем, сайтом и выходом.
 *
 * 🔴 Выше 600px её место занимает иконочный рельс (ADR-309): на 768 рельс в
 * 72px оставляет содержимому 696px из 768, а лента прятала за «Ещё» восемь
 * разделов из тринадцати.
 *
 * 🔴 Лист уходит порталом в конец документа и оказывается за пределами
 * контейнера панели, где живут её плотность и геометрия (ADR-187). Атрибут
 * грунта поэтому проставлен листу явно: без него панельные переменные внутри
 * него не определены, и свойства с ними просто не применяются.
 */
export function AdminTabs({ role }: AdminTabsProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /* Переход по ссылке листа не размонтирует оболочку: без этого лист
     остался бы висеть поверх открытого раздела. */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const activeHref = navHrefOf(pathname);
  const column = columnSectionsFor(role);
  const tabs = column.slice(0, ADMIN_TABS);
  const rest = column.slice(ADMIN_TABS);
  const bottom = bottomSectionsFor(role);

  /* «Ещё» подсвечивается, когда открыт раздел из листа: иначе на складе
     подсвеченного пункта нет вовсе, и панель выглядит потерявшей место. */
  const restActive = [...rest, ...bottom].some((section) => section.href === activeHref);

  const sheetLink = (section: AdminSection) => (
    <li key={section.href}>
      <Link
        className={[styles.sheetLink, section.href === activeHref ? styles.sheetActive : null]
          .filter(Boolean)
          .join(' ')}
        href={{ pathname: section.href }}
        aria-current={section.href === activeHref ? 'page' : undefined}
      >
        <Icon className={styles.sheetIcon} name={section.icon} />
        {section.title}
      </Link>
    </li>
  );

  return (
    <>
      <nav className={styles.tabbar} aria-label={texts.tabsLabel}>
        <ul className={styles.tabs}>
          {tabs.map((section) => {
            const current = section.href === activeHref;

            return (
              <li className={styles.cell} key={section.href}>
                <Link
                  className={[styles.tab, current ? styles.tabActive : null]
                    .filter(Boolean)
                    .join(' ')}
                  href={{ pathname: section.href }}
                  aria-current={current ? 'page' : undefined}
                >
                  <Icon name={section.icon} size={22} />
                  <span className={styles.tabLabel}>{section.short ?? section.title}</span>
                </Link>
              </li>
            );
          })}

          <li className={styles.cell}>
            <button
              className={[styles.tab, restActive ? styles.tabActive : null]
                .filter(Boolean)
                .join(' ')}
              type="button"
              onClick={() => {
                setOpen(true);
              }}
              aria-expanded={open}
            >
              <Icon name="burger" size={22} />
              <span className={styles.tabLabel}>{texts.more}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Drawer
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title={texts.moreTitle}
      >
        <div className={styles.sheet} data-ui="panel">
          <ul className={styles.sheetList}>
            {rest.map((section, index) => {
              const group = section.group;
              const caption =
                group === undefined || rest[index - 1]?.group === group
                  ? null
                  : ADMIN_GROUP_TITLES[group];

              return (
                <Fragment key={section.href}>
                  {/* Заголовок группы декоративен: список ссылок и без него
                      полный, поэтому от озвучки скрыт. */}
                  {caption === null ? null : (
                    <li className={styles.caption} aria-hidden="true">
                      {caption}
                    </li>
                  )}
                  {sheetLink(section)}
                </Fragment>
              );
            })}
          </ul>

          <ul className={[styles.sheetList, styles.sheetFoot].join(' ')}>
            {bottom.map((section) => sheetLink(section))}

            {/* «Открыть сайт» приехало сюда из убранной верхней полосы
                (ADR-309): в макете ссылки нет нигде, но владелец сверяет с
                сайтом каждую правку. Отступление — строкой в PIXEL_SPEC. */}
            <li>
              <Link
                className={styles.sheetLink}
                href={{ pathname: '/' }}
                target="_blank"
                rel="noreferrer"
              >
                <Icon className={styles.sheetIcon} name="conditioner" />
                {texts.site}
              </Link>
            </li>

            <li>
              <LogoutButton className={styles.sheetLink} iconClassName={styles.sheetIcon} />
            </li>
          </ul>
        </div>
      </Drawer>
    </>
  );
}
