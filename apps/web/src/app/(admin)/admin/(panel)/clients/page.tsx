import type { Metadata } from 'next';
import Link from 'next/link';

import {
  CLIENT_NEW_PATH,
  CLIENTS_PATH,
  ClientList,
  ClientSearch,
  clientManagerContent as texts,
  pageNumber,
} from '@/features/client-manager';
import { requireOwnerPage } from '@/server/guards';
import { counts, list } from '@/server/repo/clients';
import { Alert, Skeleton, buttonClassName } from '@/shared/ui';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { ClientsSkeleton } from './ClientsSkeleton';
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
 *
 * 🔴 Заготовки раздела живут внутри страницы, а не в `loading.tsx` (issue
 * #651). Заготовка на границе раздела уходила в ответ первой и уносила с
 * собой код 200: `notFound()` карточки удалённого клиента менял потом лишь
 * тело. Здесь до первого байта доходит только разбор адреса, а место данных
 * держит `Suspense` каждого блока.
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: CLIENT_NEW_PATH }}>
            {texts.addOpen}
          </Link>
        </div>

        {/* Строка счёта вместо прозы (макет `Clients.png`): раздел открывают,
            чтобы найти человека, а не прочитать, как устроена дедупликация.

            Свой кусок потока: счёт базы стоит над списком, и ждать ради него
            сам список значит держать пустым весь экран. Заготовка занимает ту
            же строку — плашка под ней не двигается (ADR-239). */}
        <DataBlock
          surface="bare"
          skeleton={<Skeleton variant="text" width="16ch" />}
          title={texts.loadFailed}
          note={blockErrorNote(CLIENTS_PATH)}
        >
          <ClientsCount />
        </DataBlock>
      </header>

      {/* 🔴 Плашка «Телефон — ключ» (ADR-105): она отвечает на вопрос, который
          владелец задаёт, увидев одного человека дважды, — почему второй
          карточки не появилось и как её искать. */}
      <Alert tone="info" title={texts.keyNoticeTitle}>
        {texts.keyNoticeText}
      </Alert>

      <DataBlock
        skeleton={<ClientsSkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote(CLIENTS_PATH)}
      >
        <ClientsBlock query={query} page={pageNumber(page)} />
      </DataBlock>
    </div>
  );
}

/** Счёт базы — свой кусок потока: строка стоит над плашкой и списком. */
async function ClientsCount() {
  const base = await counts();

  return <p className={styles.lead}>{texts.count(base.total, base.fresh)}</p>;
}

/**
 * Поиск и список — то, что приезжает отдельным куском потока.
 *
 * Фрагмент, а не обёртка: блоки страницы стоят колонкой с общим зазором, и
 * лишний `<div>` сдвинул бы список относительно того, что показала заготовка.
 */
async function ClientsBlock({ query, page }: { readonly query: string; readonly page: number }) {
  const found = await list({ query, page });

  return (
    <>
      <ClientSearch query={query} total={found.total} />
      <ClientList page={found} query={query} />
    </>
  );
}
