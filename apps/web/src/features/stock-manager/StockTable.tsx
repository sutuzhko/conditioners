import Link from 'next/link';

import { Badge, Card, EmptyState, Pager, Table, buttonClassName } from '@/shared/ui';

import { stockManagerContent as texts } from './content';
import { StockCell } from './StockCell';
import { StockMoveScope } from './StockMoveScope';
import {
  DEFAULT_STOCK_FILTERS,
  STOCK_MOVE_PATH,
  STOCK_PATH,
  STOCK_ZONES_PATH,
  hasShortage,
  stockFiltersApplied,
  stockItemPath,
  stockMoveQuery,
  stockQuery,
  zoneQty,
  type StockFilterState,
  type StockOverview,
  type StockZoneCard,
} from './model';
import styles from './StockTable.module.css';

export interface StockTableProps {
  readonly overview: StockOverview;
  /** Действующий фильтр: он переезжает на соседние страницы вместе с «Дальше». */
  readonly filters?: StockFilterState | undefined;
}

/**
 * Остатки: строки — позиции, колонки — зоны хранения (CRM.md §11.3).
 *
 * 🔴 Таблица существует ради перемещения между зонами, а не ради созерцания
 * (ADR-137): остаток перетаскивается мышью в соседнюю зону, а кнопка
 * «Переместить» в строке делает то же самое пальцем и с клавиатуры. Раздел
 * полностью работоспособен без единого перетаскивания.
 *
 * Разметку по-прежнему рисует сервер: клиентские только сами ячейки-ручки, и
 * ими же ограничен весь JS раздела. Заголовки, ссылки и разбивка приходят
 * готовыми.
 *
 * 🔴 Залипают обе крайние колонки: слева позиция, справа итог (issue #42,
 * #352). Без первой на четвёртой зоне непонятно, чей это остаток; без второй
 * «Итого» — то, ради чего в таблицу и смотрят, — обрывалось краем экрана и
 * доставалось только тем, кто догадался прокрутить до конца. Страница по
 * горизонтали при этом не двигается: прокрутка живёт внутри контейнера.
 * Кнопка «Переместить» стоит в первой колонке, а не в крайней правой: иначе
 * до неё с телефона нужно доехать через все зоны.
 *
 * 🔴 До 600px строка раскладывается карточкой (`variant="cards"`): колонок
 * там не остаётся, и таблица из шести зон читается только вбок. В карточке
 * остаток крупный, зоны идут списком, порог — плашкой.
 *
 * 🔴 Ширины колонок задаёт CSS, а не проп `minWidth`. Проп кладёт `min-width`
 * инлайном, снять его в медиа-запросе нечем — и карточка на 390 выходила
 * 1080px шириной, утаскивая за собой весь документ. Прокрутка обязана жить
 * внутри контейнера, а не растягивать предков (issue #352, DESIGN_BRIEF §6).
 *
 * 🔴 Строка ниже порога помечена целиком (`data-danger`), а не одной плашкой
 * в углу: список «пора заказывать» — это и есть подсвеченные строки, отдельного
 * экрана под него нет (CRM.md §11.3).
 *
 * 🔴 Отрицательный остаток помечается, а не запрещается (ADR-134): запрет
 * означал бы, что монтажник впишет неправду, лишь бы закрыть наряд.
 */
export function StockTable({ overview, filters = DEFAULT_STOCK_FILTERS }: StockTableProps) {
  if (overview.zones.length === 0) return <NoZones />;
  if (overview.items.length === 0) return <NoItems filters={filters} />;

  const { zones, items } = overview;
  /* Порог — владельческий ключ: монтажнику его не приходит вовсе, и колонка
     тогда не рисуется, а не показывает прочерки (docs/API.md §14). */
  const showMin = items.some((item) => item.minQty !== undefined);
  const shortage = items.some((item) => hasShortage(item, zones));
  /* Перемещать некуда, пока зона одна: предлагать операцию, которую сервер
     отвергнет, честнее не предлагать вовсе. */
  const movable = zones.filter((zone) => !zone.archived).length > 1;

  return (
    <div className={styles.wrap}>
      <StockMoveScope>
        <Card as="section" padding="none">
          <Table variant="cards" className={styles.grid} zebra fade label={texts.tableLabel}>
            <thead>
              <tr role="row">
                <th scope="col" className={styles.itemHead}>
                  {texts.colItem}
                </th>
                {zones.map((zone) => (
                  <th key={zone.id} scope="col" className={styles.numberHead}>
                    <span className={styles.zoneName}>{zone.name}</span>
                    <ZoneNote zone={zone} />
                  </th>
                ))}
                {showMin ? (
                  <th scope="col" className={styles.numberHead}>
                    {texts.colMin}
                  </th>
                ) : null}
                <th scope="col" className={`${styles.numberHead} ${styles.totalHead}`}>
                  {texts.colTotal}
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, row) => (
                /* 🔴 Пометка строки — это и есть список «пора заказывать»
                   (CRM.md §11.3): отдельного экрана под него нет. */
                <tr key={item.id} role="row" data-danger={item.low === true ? '' : undefined}>
                  <th scope="row" role="rowheader" className={styles.itemHead}>
                    <Link
                      className={`${styles.name} tapAction`}
                      href={{ pathname: stockItemPath(item.id) }}
                    >
                      {item.name}
                    </Link>
                    <span className={styles.itemNote}>{item.group ?? texts.itemGroupNone}</span>

                    {movable ? (
                      <Link
                        className={`${styles.move} tapAction`}
                        href={{
                          pathname: STOCK_MOVE_PATH,
                          query: stockMoveQuery({ item: item.id, kind: 'transfer' }),
                        }}
                        aria-label={texts.moveRowTitle(item.name)}
                      >
                        {texts.moveRow}
                      </Link>
                    ) : null}
                  </th>

                  {zones.map((zone, column) => (
                    <StockCell
                      key={zone.id}
                      itemId={item.id}
                      itemName={item.name}
                      unit={item.unit}
                      zoneId={zone.id}
                      zoneName={zone.name}
                      qty={zoneQty(item, zone.id)}
                      closed={zone.archived}
                      first={row === 0 && column === 0}
                    />
                  ))}

                  {showMin ? (
                    <td className={styles.number} role="cell" data-label={texts.colMin}>
                      {item.minQty === undefined || item.minQty === 0
                        ? texts.dash
                        : texts.qty(item.minQty, item.unit)}
                    </td>
                  ) : null}

                  {/* 🔴 Итог — последняя колонка, и это не порядок чтения, а
                      условие залипания: прижать к правому краю можно только
                      крайнюю справа, иначе она встаёт поверх соседней. */}
                  <td
                    className={`${styles.number} ${styles.totalCell}`}
                    role="cell"
                    data-label={texts.colTotal}
                  >
                    <span className={styles.total}>{texts.qty(item.total, item.unit)}</span>
                    {item.low === true ? (
                      <Badge variant="warning" size="sm" className={styles.mark}>
                        {texts.low}
                      </Badge>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </StockMoveScope>

      <p className={styles.hint}>{texts.tableHint}</p>
      {movable ? <p className={styles.hint}>{texts.dragHint}</p> : null}
      {shortage ? <p className={styles.warning}>{texts.minusNote}</p> : null}

      <Pager
        page={overview.page}
        pages={overview.pages}
        basePath={STOCK_PATH}
        query={stockQuery(filters)}
      />
    </div>
  );
}

/** Подпись под названием зоны: чья это машина или что она в архиве. */
function ZoneNote({ zone }: { readonly zone: StockZoneCard }) {
  if (zone.archived) return <span className={styles.zoneNote}>{texts.zoneArchived}</span>;
  if (zone.userName === null) return null;

  return <span className={styles.zoneNote}>{texts.zoneOwner(zone.userName)}</span>;
}

/**
 * 🔴 Зон нет — таблице неоткуда взяться, и раздел говорит об этом прямо.
 * Названия зоны здесь нет ни одного: свой гараж владелец называет сам.
 */
function NoZones() {
  return (
    <Card as="section">
      <EmptyState
        icon="stock"
        title={texts.emptyZonesTitle}
        action={
          <Link className={buttonClassName({ size: 'sm' })} href={STOCK_ZONES_PATH}>
            {texts.emptyZonesAction}
          </Link>
        }
      >
        {texts.emptyZonesText}
      </EmptyState>
    </Card>
  );
}

/** Позиций не видно: либо справочник пуст, либо их отсеял фильтр. */
function NoItems({ filters }: { readonly filters: StockFilterState }) {
  if (!stockFiltersApplied(filters)) {
    return (
      <Card as="section">
        <EmptyState icon="stock" title={texts.emptyItemsTitle}>
          {texts.emptyItemsText}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card as="section">
      <EmptyState
        icon="search"
        title={filters.low ? texts.emptyLow : texts.emptyFound}
        action={
          <Link
            className={buttonClassName({ size: 'sm', variant: 'bordered' })}
            href={{ pathname: STOCK_PATH }}
          >
            {texts.searchReset}
          </Link>
        }
      >
        {filters.low ? texts.emptyLowText : texts.emptyFoundText}
      </EmptyState>
    </Card>
  );
}
