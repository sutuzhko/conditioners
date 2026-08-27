import Link from 'next/link';

import { Badge, Card, Pager, Table, buttonClassName } from '@/shared/ui';

import { stockManagerContent as texts } from './content';
import {
  DEFAULT_STOCK_FILTERS,
  STOCK_PATH,
  STOCK_ZONES_PATH,
  hasShortage,
  stockFiltersApplied,
  stockItemPath,
  stockQuery,
  zoneQty,
  type StockFilterState,
  type StockItemCard,
  type StockOverview,
  type StockZoneCard,
} from './model';
import styles from './StockTable.module.css';

/** Ширины колонок для расчёта порога прокрутки — как в таблице сравнения. */
const ITEM_COLUMN_PX = 240;
const ZONE_COLUMN_PX = 150;
const SUMMARY_COLUMN_PX = 120;

export interface StockTableProps {
  readonly overview: StockOverview;
  /** Действующий фильтр: он переезжает на соседние страницы вместе с «Дальше». */
  readonly filters?: StockFilterState | undefined;
}

/**
 * Остатки: строки — позиции, колонки — зоны хранения (CRM.md §11.3).
 *
 * Серверный компонент целиком: таблица только показывает данные, а фильтр и
 * страница живут в адресе. Панель не платит за остатки ни байтом JS.
 *
 * 🔴 Первая колонка залипает (`variant="sticky"`): на четвёртой зоне без неё
 * непонятно, чей это остаток, а на телефоне таблица уезжает вбок целиком.
 * Страница по горизонтали при этом не двигается — прокрутка живёт внутри.
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
  const minWidth = `${ITEM_COLUMN_PX + zones.length * ZONE_COLUMN_PX + (showMin ? 2 : 1) * SUMMARY_COLUMN_PX}px`;

  return (
    <div className={styles.wrap}>
      <Card as="section" padding="none">
        <Table variant="sticky" zebra minWidth={minWidth} label={texts.tableLabel}>
          <thead>
            <tr>
              <th scope="col">{texts.colItem}</th>
              {zones.map((zone) => (
                <th key={zone.id} scope="col">
                  <span className={styles.zoneName}>{zone.name}</span>
                  <ZoneNote zone={zone} />
                </th>
              ))}
              <th scope="col" className={styles.numberHead}>
                {texts.colTotal}
              </th>
              {showMin ? (
                <th scope="col" className={styles.numberHead}>
                  {texts.colMin}
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <th scope="row">
                  <Link className={styles.name} href={{ pathname: stockItemPath(item.id) }}>
                    {item.name}
                  </Link>
                  <span className={styles.itemNote}>{item.group ?? texts.itemGroupNone}</span>
                </th>

                {zones.map((zone) => (
                  <Qty key={zone.id} value={zoneQty(item, zone.id)} item={item} />
                ))}

                <td className={styles.number}>
                  <span className={styles.total}>{texts.qty(item.total, item.unit)}</span>
                  {item.low === true ? (
                    <Badge variant="warning" size="sm" className={styles.mark}>
                      {texts.low}
                    </Badge>
                  ) : null}
                </td>

                {showMin ? (
                  <td className={styles.number}>
                    {item.minQty === undefined || item.minQty === 0
                      ? texts.dash
                      : texts.qty(item.minQty, item.unit)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <p className={styles.hint}>{texts.tableHint}</p>
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

/** Ячейка остатка. Ноль приглушён, минус помечен предупреждением. */
function Qty({ value, item }: { readonly value: number; readonly item: StockItemCard }) {
  if (value < 0) {
    return (
      <td className={styles.number}>
        <span className={styles.minus} title={texts.minusTitle}>
          {texts.qty(value, item.unit)}
        </span>
      </td>
    );
  }

  return (
    <td className={styles.number}>
      <span className={value === 0 ? styles.zero : undefined}>{texts.qty(value, item.unit)}</span>
    </td>
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
    <Card as="section" className={styles.empty}>
      <h2 className={styles.emptyTitle}>{texts.emptyZonesTitle}</h2>
      <p className={styles.emptyText}>{texts.emptyZonesText}</p>
      <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: STOCK_ZONES_PATH }}>
        {texts.emptyZonesAction}
      </Link>
    </Card>
  );
}

/** Позиций не видно: либо справочник пуст, либо их отсеял фильтр. */
function NoItems({ filters }: { readonly filters: StockFilterState }) {
  if (!stockFiltersApplied(filters)) {
    return (
      <Card as="section" className={styles.empty}>
        <h2 className={styles.emptyTitle}>{texts.emptyItemsTitle}</h2>
        <p className={styles.emptyText}>{texts.emptyItemsText}</p>
      </Card>
    );
  }

  return (
    <Card as="section" className={styles.empty}>
      <h2 className={styles.emptyTitle}>{filters.low ? texts.emptyLow : texts.emptyFound}</h2>
      <Link className={styles.reset} href={{ pathname: STOCK_PATH }}>
        {texts.searchReset}
      </Link>
    </Card>
  );
}
