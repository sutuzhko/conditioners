import type { Metadata } from 'next';
import Link from 'next/link';

import { CATALOG_SPECS_PATH } from '@/features/product-form';
import { SETTINGS_GROUPS } from '@/features/settings-form';
import { requireOwnerPage } from '@/server/guards';
import { readiness } from '@/server/repo/settings';
import { Badge, ButtonLink, Card, Icon } from '@/shared/ui';
import type { IconName } from '@/shared/ui';
import { adminShellContent as shell, settingsSectionsFor } from '@/widgets/admin-shell';

import styles from './page.module.css';
import { settingsPageContent as texts } from './content';

export const metadata: Metadata = { title: shell.settingsTitle };

/* Готовность читается при каждом заходе: она же и меняется на этой странице. */
export const dynamic = 'force-dynamic';

/** Карточка указателя: раздел конфигурации и что о нём известно. */
type Pointer = {
  readonly href: string;
  readonly title: string;
  readonly hint: string;
  readonly icon: IconName;
  /** Сколько групп раздела не заполнено. `undefined` — считать нечего. */
  readonly unfilled?: number | undefined;
};

/**
 * Страница-указатель «Настройки».
 *
 * Открывается пунктом, прибитым к низу колонки: конфигурацию заполняют
 * однажды и правят редко, и держать её в колонке рядом с ежедневной работой
 * значит удлинять дорогу к тому, ради чего в панель заходят каждое утро
 * (ADR-188).
 *
 * 🔴 Адреса разделов не двигаются. `/admin/company`, `/admin/prices` и
 * `/admin/notifications` остаются на месте — они разосланы в письмах и стоят
 * в закладках; добавился только этот адрес.
 *
 * 🔴 Справочник характеристик стоит здесь четвёртой карточкой, но живёт по
 * прежнему адресу внутри каталога (ADR-094, ADR-283): он про товар, и
 * открывают его сразу после того, как заводят модель.
 */
export default async function AdminSettingsPage() {
  const session = await requireOwnerPage();

  const [sections, report] = await Promise.all([
    Promise.resolve(settingsSectionsFor(session.role)),
    readiness(),
  ]);

  /* 🔴 Не заполнено — это про те же группы, что показывает «Компания»:
     прайс и уведомления живут своими страницами и в этот счёт не входят. */
  const companyKeys = new Set(SETTINGS_GROUPS.map((group) => group.key));
  const unfilled = report.groups.filter(
    (group) => companyKeys.has(group.key) && !group.ready,
  ).length;

  const pointers: readonly Pointer[] = [
    ...sections.map((section) => ({
      href: section.href,
      title: section.title,
      hint: section.hint,
      icon: section.icon,
      ...(section.href === '/admin/company' ? { unfilled } : {}),
    })),
    {
      href: CATALOG_SPECS_PATH,
      title: texts.specsTitle,
      hint: texts.specsHint,
      icon: 'conditioner',
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{shell.settingsTitle}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ul className={styles.cards}>
        {pointers.map((pointer) => (
          <li key={pointer.href}>
            <Link className={styles.card} href={{ pathname: pointer.href }}>
              <span className={styles.cardHead}>
                <span className={styles.icon} aria-hidden="true">
                  <Icon name={pointer.icon} size={20} />
                </span>

                {pointer.unfilled === undefined ? null : (
                  <Badge variant={pointer.unfilled === 0 ? 'success' : 'warning'} size="sm">
                    {pointer.unfilled === 0 ? texts.readyTitle : texts.unfilled(pointer.unfilled)}
                  </Badge>
                )}
              </span>

              <span className={styles.cardTitle}>{pointer.title}</span>
              <span className={styles.cardHint}>{pointer.hint}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* 🔴 Плашка стоит последней при любом состоянии настроек (ADR-241):
          её высота зависит от данных, а у заготовки данных нет — наверху она
          двигала бы карточки вниз ровно в том состоянии, ради которого её и
          показывают. Заметность держит цвет и короткая страница. */}
      {unfilled === 0 ? null : (
        <Card variant="accent" padding="md" className={styles.warning}>
          <p className={styles.warningTitle}>{texts.warningTitle}</p>
          <p className={styles.warningText}>{texts.warningText}</p>
          <ButtonLink href="/admin/company" size="sm" variant="bordered">
            {texts.warningAction}
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}
