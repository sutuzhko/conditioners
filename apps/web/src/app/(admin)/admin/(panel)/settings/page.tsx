import type { Metadata } from 'next';
import Link from 'next/link';

import { requireOwnerPage } from '@/server/guards';
import { adminShellContent as texts, settingsSectionsFor } from '@/widgets/admin-shell';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.settingsTitle };

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
 * Названия и подписи берутся из списка разделов: своих текстов у страницы
 * два — заголовок и подзаголовок.
 */
export default async function AdminSettingsPage() {
  const session = await requireOwnerPage();
  const sections = settingsSectionsFor(session.role);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.settingsTitle}</h1>
        <p className={styles.lead}>{texts.settingsLead}</p>
      </header>

      <ul className={styles.cards}>
        {sections.map((section) => (
          <li key={section.href}>
            <Link className={styles.card} href={{ pathname: section.href }}>
              <span className={styles.cardTitle}>{section.title}</span>
              <span className={styles.cardHint}>{section.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
