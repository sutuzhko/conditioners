import Link from 'next/link';
import type { ReactNode } from 'react';

import type { AdminRole } from '@/entities/staff/model';
import { Icon, ThemeSwitch } from '@/shared/ui';

import { LogoutButton } from './LogoutButton';
import {
  ADMIN_SHEET_GROUP_TITLES,
  ADMIN_TABS,
  adminShellContent as texts,
  bottomSectionsFor,
  columnSectionsFor,
  type AdminSection,
  type AdminSectionGroup,
} from './content';
import styles from './AdminMoreSheet.module.css';

export interface AdminMoreSheetProps {
  readonly role: AdminRole;
  /**
   * Адрес открытого раздела: по нему подсвечивается пункт. `undefined` —
   * открыт раздел, которого в листе нет, и подсвечивать нечего.
   *
   * Тип повторяет `navHrefOf`, который этот адрес и считает: перевод в `null`
   * по дороге ничего не добавлял, но требовал приведения на каждом вызове.
   */
  readonly activeHref: string | undefined;
}

/** Порядок групп разделов в листе. Тот же, что в колонке. */
const GROUPS: readonly AdminSectionGroup[] = ['work', 'site'];

/** Последняя группа: то, что на широком экране лежит в меню карточки вошедшего. */
const ACCOUNT = 'account';

/**
 * Содержимое листа «Ещё» на телефоне (issue #659).
 *
 * 🔴 Названные группы вместо двух безымянных списков подряд. Владелец сказал
 * про лист «странно выглядит», и это была не придирка: границу между
 * разделами и служебными действиями держала одна линия, а объяснить её было
 * нечем. Теперь у каждой половины есть заголовок, а заголовок самого листа
 * перестал обещать «все разделы» там, где лежат ещё и настройки, профиль,
 * тема и сайт.
 *
 * 🔴 Пустая группа не рисуется вовсе. У монтажника разделов сверх четырёх
 * вкладок нет, и «Разделы» с «Сайтом» отсутствуют у него целиком — заголовок
 * над пустотой сообщал бы, что раздел потерялся.
 *
 * Компонент отделён от `AdminTabs` ради проверки: лист живёт внутри шторки,
 * которую открывает состояние, и историей его иначе не снять — а без истории
 * его не видели ни снимки, ни инварианты. Отсюда и жалоба владельца вместо
 * красной проверки.
 */
export function AdminMoreSheet({ role, activeHref }: AdminMoreSheetProps) {
  const rest = columnSectionsFor(role).slice(ADMIN_TABS);
  const bottom = bottomSectionsFor(role);

  const link = (section: AdminSection) => (
    <li key={section.href}>
      <Link
        className={[styles.link, section.href === activeHref ? styles.active : null]
          .filter(Boolean)
          .join(' ')}
        href={{ pathname: section.href }}
        aria-current={section.href === activeHref ? 'page' : undefined}
      >
        <Icon className={styles.icon} name={section.icon} />
        {section.title}
      </Link>
    </li>
  );

  return (
    <div className={styles.sheet} data-ui="panel">
      {GROUPS.map((group) => {
        const items = rest.filter((section) => section.group === group);
        if (items.length === 0) return null;

        return (
          <Group key={group} id={group} title={ADMIN_SHEET_GROUP_TITLES[group]}>
            {items.map((section) => link(section))}
          </Group>
        );
      })}

      {/* Имя группы то же, что у меню карточки вошедшего на широком экране: за
          одним именем на двух экранах обязано стоять одно и то же. */}
      <Group id={ACCOUNT} title={texts.accountLabel}>
        {bottom.map((section) => link(section))}

        {/* «Открыть сайт» приехало сюда из убранной верхней полосы (ADR-309):
            в макете ссылки нет нигде, но владелец сверяет с сайтом каждую
            правку. Отступление — строкой в PIXEL_SPEC. */}
        <li>
          <Link className={styles.link} href={{ pathname: '/' }} target="_blank" rel="noreferrer">
            <Icon className={styles.icon} name="conditioner" />
            {texts.site}
            {/* Смена контекста названа словами: новая вкладка без
                предупреждения — типовая жалоба на скринридере. */}
            <span className="srOnly"> {texts.siteNewTab}</span>
          </Link>
        </li>

        {/* 🔴 Тема — строка группы настроек, а не значок в углу каждой страницы
            (issue #659). Пилюля с двумя подписями, а не кнопка со значком:
            значок без подписи в шторке читается как загадка, и обе темы должны
            быть видны сразу (issue #248). Подпись слева видима — переключатель
            без видимого имени нарушает то же правило, что поле без подписи. */}
        <li className={styles.themeRow}>
          <span className={styles.themeLabel}>{texts.themeLabel}</span>
          <ThemeSwitch label={texts.themeLabel} />
        </li>
      </Group>
    </div>
  );
}

/**
 * Группа листа: заголовок и список под ним.
 *
 * 🔴 Заголовок настоящий, а не декоративная строка. В колонке подпись группы
 * скрыта от озвучки — там список короткий и целиком на виду; в листе групп
 * несколько, и читалка ходит по ним заголовками. Скрытый заголовок оставил бы
 * незрячего с одной длинной лентой ссылок без границ.
 *
 * 🔴 Идентификатор собирается из ключа группы, а не из её названия: в
 * `aria-labelledby` пробел разделяет несколько идентификаторов, и «Настройки и
 * профиль» превратились бы в ссылку на три несуществующих узла.
 */
function Group({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  const headingId = `admin-more-${id}`;

  return (
    <section className={styles.group} aria-labelledby={headingId}>
      <h2 className={styles.caption} id={headingId}>
        {title}
      </h2>
      <ul className={styles.list}>{children}</ul>
    </section>
  );
}

/**
 * Подвал листа: выход.
 *
 * 🔴 Отдельно от списков, а не последним пунктом среди них (issue #659).
 * «Выйти» — единственное действие в листе, всё остальное переходы, и одним
 * весом с «Настройками» оно стояло ровно потому, что носило их класс. Подвал
 * шторки кит уже держит прижатым к низу, со своей поверхностью и отступом под
 * системную полосу жестов: на длинном листе владельца выход перестаёт
 * требовать прокрутки до конца.
 *
 * Грунт панели проставлен и здесь: подвал — сосед тела шторки, а не его
 * потомок, и панельные переменные сами в него не приходят (ADR-187).
 */
export function AdminMoreFooter() {
  return (
    <div data-ui="panel">
      <LogoutButton className={styles.logout} iconClassName={styles.icon} />
    </div>
  );
}
