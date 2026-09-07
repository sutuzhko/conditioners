import Link from 'next/link';

import { ButtonLink, Card, EmptyState, Table } from '@/shared/ui';

import { STOCK_MOVE_TITLES, stockManagerContent as texts } from './content';
import { StockJournalFilters } from './StockJournalFilters';
import { StockPager } from './StockPager';
import {
  DEFAULT_STOCK_JOURNAL_FILTERS,
  DEFAULT_STOCK_PAGE_SIZE,
  stockJournalApplied,
  stockJournalQuery,
  stockItemPath,
  type StockJournalFilterState,
  type StockMovementCard,
  type StockMovementPage,
  type StockPageSize,
} from './model';
import styles from './StockJournal.module.css';

export interface StockJournalProps {
  readonly journal: StockMovementPage;
  /** Адрес экрана, которому принадлежит журнал: разбивка остаётся ссылками. */
  readonly basePath: string;
  /**
   * Параметры адреса, без которых экран не открывается, — вкладка раздела
   * (issue #352). Журнал живёт на `/admin/stock?tab=log`, и фильтр вида,
   * потерявший `tab`, увёл бы на остатки.
   */
  readonly baseQuery?: Record<string, string> | undefined;
  /**
   * Колонка позиции. В карточке позиция одна и колонка ничего не сообщает, а на
   * журнале всего склада она главная: «что двигали» — первый вопрос к нему.
   */
  readonly withItem?: boolean | undefined;
  /** Чем объяснить пустой журнал: у склада и у позиции это разные ответы. */
  readonly emptyText?: string | undefined;
  /**
   * Что отобрано: вид, период, поиск. Живёт в адресе, а не в состоянии:
   * отфильтрованный журнал — ссылка, которую можно сохранить и прислать себе.
   */
  readonly filters?: StockJournalFilterState | undefined;
  /** Показывать ли отбор: у одной позиции движений мало, и он там лишний. */
  readonly withFilter?: boolean | undefined;
  /**
   * Сколько строк на странице. Выбор владельца, а не константа (issue #725):
   * журнал стоял на зашитых двадцати, пока у остатков шаг уже переключался, —
   * и две разбивки с разными возможностями в одном разделе читаются как сбой.
   */
  readonly size?: StockPageSize | undefined;
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
  baseQuery,
  withItem = false,
  emptyText = texts.journalEmpty,
  filters = DEFAULT_STOCK_JOURNAL_FILTERS,
  withFilter = false,
  size = DEFAULT_STOCK_PAGE_SIZE,
}: StockJournalProps) {
  /* Отбор переезжает вместе со страницей: иначе «Дальше» сбрасывает фильтр и
     человек читает не тот журнал, который открыл. Вкладка раздела едет с ним
     же — без неё адрес открывает остатки. */
  const base = baseQuery ?? {};
  const carried = { ...base, ...stockJournalQuery(filters) };

  const filter = withFilter ? (
    <StockJournalFilters filters={filters} basePath={basePath} baseQuery={base} />
  ) : null;

  if (journal.items.length === 0) {
    /* Пусто по отбору и пусто вообще — разные ответы: в первом случае
       движения есть, их скрыл фильтр, и об этом надо сказать прямо. */
    const applied = withFilter && stockJournalApplied(filters);

    return (
      <Card as="section">
        <h2 className={styles.title}>{texts.journalTitle}</h2>
        {filter}

        {/* 🔴 Выход даётся только пустоте по отбору: движения есть, их скрыл
            фильтр, и ссылка возвращает журнал целиком. У пустого журнала
            выхода нет — сбрасывать нечего, остаток появится после первого
            прихода, и кнопка «Сбросить» там солгала бы о причине (issue
            #580). Адрес сброса — экран со своей вкладкой и без условий
            журнала: без `tab` он увёл бы на остатки. */}
        <EmptyState
          icon={applied ? 'search' : 'stock'}
          title={applied ? texts.journalNothingTitle : texts.journalEmptyTitle}
          action={
            applied ? (
              <ButtonLink href={{ pathname: basePath, query: base }} size="sm" variant="bordered">
                {texts.journalEmptyAction}
              </ButtonLink>
            ) : undefined
          }
        >
          {applied ? texts.journalNothingText : emptyText}
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* 🔴 Ниже 600px карточка списка снимает с себя рамку, фон и тень: под
          ней лежат двадцать своих карточек движений, и вторая коробка вокруг
          них только шумит. Приём тот же, что у остатков (issue #609): одна
          скруглённая коробка на движение — само движение. */}
      <Card as="section" padding="none" className={styles.board}>
        <div className={styles.head}>
          <h2 className={styles.title}>{texts.journalTitle}</h2>
          <p className={styles.hint}>{texts.journalHint}</p>
          {filter}
          {withFilter && stockJournalApplied(filters) ? (
            <p className={styles.found}>{texts.journalFound(journal.total)}</p>
          ) : null}
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
          <Table variant="cards" className={styles.grid} label={texts.journalTitle}>
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

        {/* Подвал рисует сам пагинатор: когда листать нечего и выбирать шаг не
            из чего, под журналом не остаётся пустой полосы с линией. */}
        <StockPager
          page={journal.page}
          pages={journal.pages}
          count={texts.shownMoves(journal.items.length, journal.total)}
          scope={journal.total}
          size={size}
          basePath={basePath}
          query={carried}
        />
      </Card>
    </div>
  );
}

/**
 * Одно движение. Знак у количества свой только у инвентаризации.
 *
 * 🔴 `data-blank` на ячейке — это разметка, а не догадка стилей (issue #725).
 * На карточке телефона пустая колонка не рисуется вовсе: прочерк «Откуда — »
 * занимает строку и не сообщает ничего, а вот на широком экране он держит
 * колонку и остаётся. Отличить одно от другого в CSS нечем — признак ставит
 * тот, кто знает данные.
 */
function Row({ move, withItem }: { readonly move: StockMovementCard; readonly withItem: boolean }) {
  return (
    <tr className={styles.row} role="row">
      <td role="cell" data-label={texts.colWhen} className={styles.when}>
        <time dateTime={move.createdAt}>{texts.moment(move.createdAt)}</time>
      </td>
      <td role="cell" data-label={texts.colKind} className={styles.kind}>
        {STOCK_MOVE_TITLES[move.kind]}
      </td>
      {withItem ? (
        <td role="cell" data-label={texts.colItem} className={styles.itemCell}>
          {/* Из журнала склада уходят в карточку: «куда делась эта труба» —
              следующий вопрос после «что вообще происходило». */}
          <Link className={styles.item} href={{ pathname: stockItemPath(move.item.id) }}>
            {move.item.name}
          </Link>
        </td>
      ) : null}
      {/* 🔴 Количество со знаком (issue #610): приход и списание в этой
          колонке выглядели одинаково, а по журналу сверяют остаток. */}
      <td role="cell" data-label={texts.colQty} className={styles.qty}>
        {texts.qtySigned(move.kind, move.qty, move.item.unit)}
      </td>
      <td
        role="cell"
        data-label={texts.colFrom}
        className={styles.from}
        data-blank={move.fromZone === null ? '' : undefined}
      >
        {move.fromZone === null ? texts.dash : move.fromZone.name}
      </td>
      <td
        role="cell"
        data-label={texts.colTo}
        className={styles.to}
        data-blank={move.toZone === null ? '' : undefined}
      >
        {move.toZone === null ? texts.dash : move.toZone.name}
      </td>
      <td
        role="cell"
        data-label={texts.colOrder}
        className={styles.orderCell}
        data-blank={move.order === null ? '' : undefined}
      >
        {move.order === null ? (
          texts.dash
        ) : (
          <Link className={styles.order} href={{ pathname: `/admin/orders/${move.order.id}` }}>
            {texts.order(move.order.number)}
          </Link>
        )}
      </td>
      <td role="cell" data-label={texts.colAuthor} className={styles.author}>
        {move.authorName ?? <span className={styles.gone}>{texts.authorGone}</span>}
      </td>
      <td
        role="cell"
        data-label={texts.colReason}
        className={styles.reason}
        data-blank={move.reason === null ? '' : undefined}
      >
        {move.reason ?? texts.dash}
      </td>
    </tr>
  );
}
