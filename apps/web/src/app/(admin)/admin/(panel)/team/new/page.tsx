import type { Metadata } from 'next';
import Link from 'next/link';

import { StaffCreateForm, TEAM_PATH, staffManagerContent as texts } from '@/features/staff-manager';
import { requireOwnerPage } from '@/server/guards';
import { Card } from '@/shared/ui';

import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.addTitle };

export const dynamic = 'force-dynamic';

/**
 * Та же форма страницей.
 *
 * 🔴 Прямой заход по адресу окна обязан отдавать полноценную страницу: иначе
 * ссылка на форму создания ведёт в пустоту, а обновление теряет ввод
 * (ADR-117). Перехват работает только на переходе внутри раздела, и это ровно
 * то, чего от него ждут.
 *
 * Заголовок и рамку даёт страница — форма приносит только поля, как и в окне.
 * Проверка роли стоит до рендера формы (ADR-095).
 */
export default async function AdminTeamNewPage() {
  await requireOwnerPage();

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: TEAM_PATH }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.addTitle}</h1>
        <p className={styles.lead}>{texts.addHint}</p>
      </header>

      <Card>
        <StaffCreateForm surface="bare" />
      </Card>
    </div>
  );
}
