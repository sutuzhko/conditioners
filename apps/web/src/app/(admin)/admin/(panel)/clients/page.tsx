import type { Metadata } from 'next';
import Link from 'next/link';

import {
  CLIENT_NEW_PATH,
  ClientList,
  ClientSearch,
  clientManagerContent as texts,
  pageNumber,
} from '@/features/client-manager';
import { requireOwnerPage } from '@/server/guards';
import { list } from '@/server/repo/clients';
import { buttonClassName } from '@/shared/ui';

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
 * 🔴 Заведение клиента ушло в окно с собственным адресом (ADR-117): свёрнутая
 * форма над списком уводила карточки вниз ровно тогда, когда на них смотрят.
 * Кнопка «Добавить» — ссылка, а не состояние: окно открывается адресом.
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
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: CLIENT_NEW_PATH }}>
            {texts.addOpen}
          </Link>
        </div>

        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ClientSearch query={query} total={found.total} />
      <ClientList page={found} query={query} />
    </div>
  );
}
