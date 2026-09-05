'use client';

import { useRouter } from 'next/navigation';

import { ButtonLink, Card, EmptyState, Pager, Table } from '@/shared/ui';

import { ClientRow } from './ClientRow';
import { clientManagerContent as texts } from './content';
import { CLIENTS_PATH, type ClientApi, type ClientPage } from './model';
import styles from './ClientList.module.css';

export interface ClientListProps {
  readonly page: ClientPage;
  /** Действующий поиск: пустой список тогда объясняется иначе. */
  readonly query?: string | undefined;
  readonly api?: ClientApi | undefined;
}

/**
 * Список клиентов таблицей со страницами (issue #602, макет `Clients.png`).
 *
 * 🔴 Колонки «Заказов», «Сумма» и «Последний» — то, ради чего список
 * перестал быть карточками: по ним видно, кто ездит каждый год, а кто
 * отвалился. У карточек эти числа стоят в разных местах каждой карточки.
 *
 * Клиентский лист — из-за действий строки: удаление спрашивает подтверждение
 * (ADR-113) и обновляет список. Сами данные приходят с сервера пропсами,
 * второго их слепка на клиенте нет.
 *
 * Ниже 600px строки разворачиваются карточками (`variant="cards"`): семь
 * колонок на телефоне превращаются в боковую прокрутку.
 */
export function ClientList({ page, query = '', api }: ClientListProps) {
  const router = useRouter();

  if (page.items.length === 0) {
    return (
      <Card as="section">
        {query === '' ? (
          <EmptyState icon="clients" title={texts.emptyTitle}>
            {texts.emptyText}
          </EmptyState>
        ) : (
          <EmptyState
            icon="search"
            title={texts.emptyFound}
            action={
              <ButtonLink href="/admin/clients" size="sm" variant="bordered">
                {texts.emptyFoundAction}
              </ButtonLink>
            }
          >
            {texts.emptyFoundText}
          </EmptyState>
        )}
      </Card>
    );
  }

  return (
    <div className={styles.list}>
      <Card as="section" padding="none" className={styles.card}>
        <Table variant="cards" label={texts.tableLabel} className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{texts.colClient}</th>
              <th scope="col">{texts.colPhone}</th>
              <th scope="col">{texts.colAddress}</th>
              <th scope="col">{texts.colOrders}</th>
              <th scope="col">{texts.colSum}</th>
              <th scope="col">{texts.colLast}</th>
              <th scope="col">
                <span className="srOnly">{texts.colActions}</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {page.items.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                {...(api === undefined ? {} : { api })}
                onChanged={() => router.refresh()}
              />
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Номера страниц по макету (issue #602): прыжок в начало и в конец
          базы стоит одного нажатия, а не десяти шагов «Дальше». */}
      <Pager
        page={page.page}
        pages={page.pages}
        basePath={CLIENTS_PATH}
        query={query === '' ? undefined : { q: query }}
        numbers
      />
    </div>
  );
}
