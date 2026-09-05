'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import type { AdminRole } from '@/entities/staff/model';
import type { AdminCounts } from '@/shared/config/admin-counters';
import { Icon, Tooltip } from '@/shared/ui';

import { AdminWho } from './AdminWho';
import {
  ADMIN_COUNTER_TITLES,
  ADMIN_GROUP_TITLES,
  ADMIN_ROLE_TITLES,
  adminShellContent as texts,
  bottomSectionsFor,
  columnSectionsFor,
  navHrefOf,
  type AdminSection,
} from './content';
import styles from './AdminNav.module.css';

export type AdminNavProps = {
  /** Монтажник видит три раздела из пятнадцати — список собирается по роли. */
  readonly role: AdminRole;
  /** Кто вошёл: имя из профиля, иначе логин. */
  readonly userName: string;
  /**
   * Сколько ждёт в очередях. Считается на сервере в одном месте и приходит
   * пропсом: колонка к базе не ходит (ADR-309).
   */
  readonly counts?: AdminCounts | undefined;
};

/**
 * Подсказка значка в рельсе (ADR-309).
 *
 * 🔴 `Tooltip` кита вместо `title=`: браузерная подсказка появляется через
 * секунду, не открывается с клавиатуры и не убирается по Esc — то есть для
 * половины способов ввода её нет. Смысл при этом не держится на подсказке:
 * подпись пункта остаётся в разметке и озвучивается, даже когда её не видно.
 *
 * 🔴 Пузырёк гасится стилями, а не условием в коде: на широком экране подпись
 * видна, и подсказка повторяла бы её слово в слово. Ветвление по ширине в JS
 * дало бы либо расхождение гидратации, либо мигание после загрузки — тот же
 * выбор, что у всей оболочки.
 */
function NavTip({ text, children }: { readonly text: string; readonly children: ReactNode }) {
  return (
    <Tooltip className={styles.tip} text={text} placement="right">
      {children}
    </Tooltip>
  );
}

/**
 * Боковая навигация панели.
 *
 * Колонка устроена в три яруса (ADR-188): сверху карточка «кто вошёл», в
 * середине прокручиваемый список разделов, внизу прибитое редкое — настройки,
 * профиль, сайт и выход. Прокручивается только середина: прибитый низ на то и
 * прибитый, чтобы за ним не нужно было листать.
 *
 * 🔴 На планшете колонка сворачивается в рельс, и подпись пункта уходит из
 * виду — но не из разметки: она остаётся для читалки, а не заменяется
 * `aria-label`. Имя, написанное дважды, расходится с видимым на первой же
 * правке, и читалка начинает называть пункт не так, как он подписан.
 *
 * Клиентский компонент ровно из-за одного: текущий раздел подсвечивается по
 * адресу. Всё остальное в оболочке остаётся серверным.
 */
export function AdminNav({ role, userName, counts }: AdminNavProps) {
  const pathname = usePathname();

  const sections = columnSectionsFor(role);
  const bottom = bottomSectionsFor(role);

  /* Подсветку определяет пункт колонки, а не раздел: на `/admin/company`
     горят «Настройки», через которые в него и заходят. */
  const activeHref = navHrefOf(pathname);

  const link = (section: AdminSection) => {
    const current = section.href === activeHref;
    const counter = section.counter;
    const waiting = counter === undefined ? undefined : counts?.[counter];

    return (
      <NavTip text={section.title}>
        <Link
          className={[styles.link, current ? styles.active : null].filter(Boolean).join(' ')}
          href={{ pathname: section.href }}
          aria-current={current ? 'page' : undefined}
        >
          <Icon className={styles.icon} name={section.icon} />
          <span className={styles.label}>{section.title}</span>

          {/* 🔴 Счётчик рисуется и на нуле, и это ответ, а не пустота: «ноль
              отзывов на модерации» — рабочее состояние, которое владелец
              смотрит каждое утро. Нет счётчика вовсе только у разделов, где
              ждать нечего, и у монтажника — очереди все владельца. */}
          {waiting === undefined || counter === undefined ? null : (
            <span className={styles.count}>
              {waiting}
              {/* Подпись слышна, но не видна: голое число озвучивается как
                  «Заказы 7» и не отвечает, семь чего. */}
              <span className={styles.countTitle}> {ADMIN_COUNTER_TITLES[counter]}</span>
            </span>
          )}
        </Link>
      </NavTip>
    );
  };

  return (
    <div className={styles.column}>
      <AdminWho name={userName} roleTitle={ADMIN_ROLE_TITLES[role]} sections={bottom} />

      <nav className={styles.nav} aria-label={texts.navLabel}>
        <ul className={styles.list}>
          {sections.map((section, index) => {
            /* Заголовок группы рисуется перед её первым разделом. Он
               декоративный: список ссылок и без него полный, поэтому от
               озвучки скрыт. */
            const group = section.group;
            const caption =
              group === undefined || sections[index - 1]?.group === group
                ? null
                : ADMIN_GROUP_TITLES[group];

            return (
              <li key={section.href}>
                {caption === null ? null : (
                  <span className={styles.caption} aria-hidden="true">
                    {caption}
                  </span>
                )}
                {link(section)}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 🔴 Прибитого низа больше нет: «Настройки», «Профиль», «Открыть сайт» и
          «Выйти» живут в меню карточки вошедшего, и повторять их в колонке
          значит занимать четыре пункта тем, что уже доступно в одно нажатие.
          Повтор стоил колонке прокрутки на большом экране — решение владельца
          от 4 сентября. В рельсе и в ленте вкладок они там же. */}
    </div>
  );
}
