import type { Metadata } from 'next';

import {
  ACTIVITY_PATH,
  ActivityList,
  activityLogContent as texts,
  type ActivitySearchParams,
} from '@/features/activity-log';
import { requireOwnerPage } from '@/server/guards';
import { list } from '@/server/repo/activity';
import { pageNumber } from '@/shared/lib/paging';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { ActivitySkeleton } from './ActivitySkeleton';
import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

/* Журнал показывает то, что произошло секунду назад: кешировать нечего.
   `noindex` приходит от раскладки панели — он общий у всех её страниц. */
export const dynamic = 'force-dynamic';

/**
 * Журнал событий (ADR-345).
 *
 * 🔴 Страница отдаётся сервером уже со строками (инвариант 1): список читает
 * серверный компонент и передаёт вниз пропсами, листается адресом.
 *
 * 🔴 Проверка доступа стоит до первого чтения данных (ADR-095). Пока ролей две,
 * журнал — раздел владельца; разрешение «Журнал» для администратора приходит
 * фазой 5 вместе с ролями ADR-344.
 *
 * 🔴 Список уехал в свой кусок потока: упавший запрос забирает список, а не
 * раздел — заголовок остаётся на месте, «Повторить» стоит там, где был список
 * (issue #495, #581).
 *
 * В колонку разделов пункт пока не поставлен: раздел журнала — это отбор,
 * лента в карточке сущности и разбивка (фаза 4), и место в навигации он
 * получает там же, вместе со своим значком.
 */
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<ActivitySearchParams>;
}) {
  await requireOwnerPage();

  const params = await searchParams;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <DataBlock
        skeleton={<ActivitySkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote(ACTIVITY_PATH)}
      >
        <ActivityBlock page={pageNumber(params.page)} />
      </DataBlock>
    </div>
  );
}

/** Сам список — то, что приезжает отдельным куском потока. */
async function ActivityBlock({ page }: { readonly page: number }) {
  const journal = await list({ page });

  return <ActivityList journal={journal} />;
}
