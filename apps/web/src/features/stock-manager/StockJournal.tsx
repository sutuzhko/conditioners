import Link from 'next/link';

import { Card, Pager, Table } from '@/shared/ui';

import { STOCK_MOVE_TITLES, stockManagerContent as texts } from './content';
import type { StockMovementCard, StockMovementPage } from './model';
import styles from './StockJournal.module.css';

export interface StockJournalProps {
  readonly journal: StockMovementPage;
  /** Адрес страницы позиции: разбивка остаётся ссылками. */
  readonly basePath: string;
}

/**
 * Журнал движений позиции: что, куда, сколько, кто и когда.
 *
 * 🔴 Ради него склад и заводится: без журнала вопрос «куда делись тридцать
 * метров трассы» остаётся без ответа, а остаток превращается в число, которое
 * все правят по памяти (CRM.md §11.5).
 *
 * Серверный компонент: журнал только показывают, а листают адресом.
 */
export function StockJournal({ journal, basePath }: StockJournalProps) {
  if (journal.items.length === 0) {
    return (
      <Card as="section">
        <h2 className={styles.title}>{texts.journalTitle}</h2>
        <p className={styles.empty}>{texts.journalEmpty}</p>
      </Card>
    );
  }

  return (
    <div className={styles.wrap}>
      <Card as="section" padding="none">
        <div className={styles.head}>
          <h2 className={styles.title}>{texts.journalTitle}</h2>
          <p className={styles.hint}>{texts.journalHint}</p>
        </div>

        {/* `cards` требует подписи в каждой ячейке и явных ролей: раскладка
            карточками сделана через `display: block`, а он снимает с таблицы
            её семантику (см. комментарий в Table.tsx). */}
        <Table variant="cards" label={texts.journalTitle}>
          <thead>
            <tr role="row">
              <th scope="col">{texts.colWhen}</th>
              <th scope="col">{texts.colKind}</th>
              <th scope="col">{texts.colQty}</th>
              <th scope="col">{texts.colFrom}</th>
              <th scope="col">{texts.colTo}</th>
              <th scope="col">{texts.colOrder}</th>
              <th scope="col">{texts.colAuthor}</th>
              <th scope="col">{texts.colReason}</th>
            </tr>
          </thead>
          <tbody>
            {journal.items.map((move) => (
              <Row key={move.id} move={move} />
            ))}
          </tbody>
        </Table>
      </Card>

      <Pager page={journal.page} pages={journal.pages} basePath={basePath} />
    </div>
  );
}

/** Одно движение. Знак у количества свой только у инвентаризации. */
function Row({ move }: { readonly move: StockMovementCard }) {
  return (
    <tr role="row">
      <td role="cell" data-label={texts.colWhen}>
        <time dateTime={move.createdAt}>{texts.moment(move.createdAt)}</time>
      </td>
      <td role="cell" data-label={texts.colKind}>
        {STOCK_MOVE_TITLES[move.kind]}
      </td>
      <td role="cell" data-label={texts.colQty} className={styles.qty}>
        {texts.qty(move.qty, move.item.unit)}
      </td>
      <td role="cell" data-label={texts.colFrom}>
        {move.fromZone === null ? texts.dash : move.fromZone.name}
      </td>
      <td role="cell" data-label={texts.colTo}>
        {move.toZone === null ? texts.dash : move.toZone.name}
      </td>
      <td role="cell" data-label={texts.colOrder}>
        {move.order === null ? (
          texts.dash
        ) : (
          <Link className={styles.order} href={{ pathname: `/admin/orders/${move.order.id}` }}>
            {texts.order(move.order.number)}
          </Link>
        )}
      </td>
      <td role="cell" data-label={texts.colAuthor}>
        {move.authorName ?? <span className={styles.gone}>{texts.authorGone}</span>}
      </td>
      <td role="cell" data-label={texts.colReason} className={styles.reason}>
        {move.reason ?? texts.dash}
      </td>
    </tr>
  );
}
