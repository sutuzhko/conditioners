import { ButtonLink, Card, EmptyState, Pager } from '@/shared/ui';

import { ClientCardView } from './ClientCardView';
import { clientManagerContent as texts } from './content';
import { CLIENTS_PATH, type ClientPage } from './model';
import styles from './ClientList.module.css';

export interface ClientListProps {
  readonly page: ClientPage;
  /** Действующий поиск: пустой список тогда объясняется иначе. */
  readonly query?: string | undefined;
}

/**
 * Список клиентов со страницами.
 *
 * Серверный компонент целиком: карточки только показывают данные, а переход
 * между страницами — это адрес, а не состояние. Панель не платит за список
 * ни байтом JS.
 */
export function ClientList({ page, query = '' }: ClientListProps) {
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
      {page.items.map((client) => (
        <ClientCardView key={client.id} client={client} />
      ))}

      <Pager
        page={page.page}
        pages={page.pages}
        basePath={CLIENTS_PATH}
        query={query === '' ? undefined : { q: query }}
      />
    </div>
  );
}
