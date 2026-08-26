import type { Metadata } from 'next';

import {
  ClientAdd,
  ClientList,
  ClientSearch,
  clientManagerContent as texts,
  pageNumber,
} from '@/features/client-manager';
import { requireOwnerPage } from '@/server/guards';
import { list } from '@/server/repo/clients';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * База клиентов.
 *
 * Поиск и страница живут в адресе, а не в состоянии на клиенте: найденное
 * можно оставить в закладках и вернуться к нему завтра — так же, как к
 * отфильтрованным заявкам.
 *
 * Читаем `repo` напрямую, а не своим же запросом к `/api/admin/clients`:
 * страница и так серверная, лишний круг через сеть — лишний способ отказать.
 */
export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  /* Раздел владельца: в базе адреса и телефоны людей — проверка до чтения
     данных (ADR-095). */
  await requireOwnerPage();

  const { q, page } = await searchParams;
  const query = q?.trim() ?? '';
  const found = await list({ query, page: pageNumber(page) });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ClientSearch query={query} total={found.total} />
      <ClientAdd />
      <ClientList page={found} query={query} />
    </div>
  );
}
