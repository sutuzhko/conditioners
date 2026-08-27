import Link from 'next/link';

import { STOCK_MOVE_KINDS, type StockMoveKind } from '@/entities/stock/model';
import { Card, Pager, Table } from '@/shared/ui';

import { STOCK_MOVE_TITLES, stockManagerContent as texts } from './content';
import { stockItemPath, type StockMovementCard, type StockMovementPage } from './model';
import styles from './StockJournal.module.css';

export interface StockJournalProps {
  readonly journal: StockMovementPage;
  /** Адрес экрана, которому принадлежит журнал: разбивка остаётся ссылками. */
  readonly basePath: string;
  /**
   * Колонка позиции. В карточке позиция одна и колонка ничего не сообщает, а на
   * журнале всего склада она главная: «что двигали» — первый вопрос к нему.
   */
  readonly withItem?: boolean | undefined;
  /** Чем объяснить пустой журнал: у склада и у позиции это разные ответы. */
  readonly emptyText?: string | undefined;
  /**
   * Выбранный вид движения. Живёт в адресе, а не в состоянии: отфильтрованный
   * журнал — ссылка, которую можно сохранить и прислать себе.
   */
  readonly kind?: StockMoveKind | undefined;
  /** Показывать ли фильтр: у одной позиции движений мало, и он там лишний. */
  readonly withFilter?: boolean | undefined;
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
export function StockJournal({
  journal,
  basePath,
  withItem = false,
  emptyText = texts.journalEmpty,
  kind,
  withFilter = false,
}: StockJournalProps) {
  /* Выбранный вид переезжает вместе со страницей: иначе «Дальше» сбрасывает
     фильтр и человек читает не тот журнал, который открыл. */
  const carried = kind === undefined ? undefined : { kind };

  const filter = withFilter ? (
    <nav className={styles.filter} aria-label={texts.journalFilter}>
      <Link
        className={[styles.chip, kind === undefined ? styles.active : null]
          .filter(Boolean)
          .join(' ')}
        href={{ pathname: basePath }}
        aria-current={kind === undefined ? 'page' : undefined}
      >
        {texts.journalAllKinds}
      </Link>
      {STOCK_MOVE_KINDS.map((option) => (
        <Link
          key={option}
          className={[styles.chip, kind === option ? styles.active : null]
            .filter(Boolean)
            .join(' ')}
          href={{ pathname: basePath, query: { kind: option } }}
          aria-current={kind === option ? 'page' : undefined}
        >
          {STOCK_MOVE_TITLES[option]}
        </Link>
      ))}
    </nav>
  ) : null;
  if (journal.items.length === 0) {
    return (
      <Card as="section">
        <h2 className={styles.title}>{texts.journalTitle}</h2>
        {filter}
        <p className={styles.empty}>{emptyText}</p>
      </Card>
    );
  }

  return (
    <div className={styles.wrap}>
      <Card as="section" padding="none">
        <div className={styles.head}>
          <h2 className={styles.title}>{texts.journalTitle}</h2>
          <p className={styles.hint}>{texts.journalHint}</p>
          {filter}
        </div>

        {/* Журнал склада шире журнала позиции на целую колонку и на широком
            экране в карточку не влезает. Прокрутка живёт внутри — страница по
            горизонтали не двигается никогда (DESIGN_BRIEF §6), — и открыта с
            клавиатуры, а не только пальцем. */}
        <div
          className={withItem ? styles.scroller : undefined}
          role={withItem ? 'region' : undefined}
          aria-label={withItem ? texts.journalTitle : undefined}
          tabIndex={withItem ? 0 : undefined}
        >
          {/* `cards` требует подписи в каждой ячейке и явных ролей: раскладка
              карточками сделана через `display: block`, а он снимает с таблицы
              её семантику (см. комментарий в Table.tsx). */}
          <Table variant="cards" label={texts.journalTitle}>
            <thead>
              <tr role="row">
                <th scope="col">{texts.colWhen}</th>
                <th scope="col">{texts.colKind}</th>
                {withItem ? <th scope="col">{texts.colItem}</th> : null}
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
                <Row key={move.id} move={move} withItem={withItem} />
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Pager
        page={journal.page}
        pages={journal.pages}
        basePath={basePath}
        {...(carried === undefined ? {} : { query: carried })}
      />
    </div>
  );
}

/** Одно движение. Знак у количества свой только у инвентаризации. */
function Row({ move, withItem }: { readonly move: StockMovementCard; readonly withItem: boolean }) {
  return (
    <tr role="row">
      <td role="cell" data-label={texts.colWhen}>
        <time dateTime={move.createdAt}>{texts.moment(move.createdAt)}</time>
      </td>
      <td role="cell" data-label={texts.colKind}>
        {STOCK_MOVE_TITLES[move.kind]}
      </td>
      {withItem ? (
        <td role="cell" data-label={texts.colItem}>
          {/* Из журнала склада уходят в карточку: «куда делась эта труба» —
              следующий вопрос после «что вообще происходило». */}
          <Link className={styles.item} href={{ pathname: stockItemPath(move.item.id) }}>
            {move.item.name}
          </Link>
        </td>
      ) : null}
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
