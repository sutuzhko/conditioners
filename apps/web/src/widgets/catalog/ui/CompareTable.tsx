import { Badge, Card, Table } from '@/shared/ui';
import { buildCompareTable } from '@/entities/product/lib/buildCompareTable';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { formatMoney } from '@/shared/lib/format';
import { catalogText } from '../content';
import type { CatalogProduct } from '../model';
import styles from './CompareTable.module.css';

/**
 * Ширина колонок для расчёта порога скролла. Ниже суммы таблица начинает
 * ехать внутри своего контейнера, а не растягивать страницу.
 */
const SPEC_COLUMN_PX = 200;
const VALUE_COLUMN_PX = 160;

export interface CompareTableProps {
  products: readonly CatalogProduct[];
  /** Момент расчёта скидки — тот же, что у карточек: цена не смеет разойтись. */
  now?: Date | undefined;
}

/**
 * Сравнение моделей.
 *
 * 🔴 Список строк не задан в разметке: это объединение ключей `specs` всех
 * видимых моделей, которое считает `buildCompareTable` (инвариант 6). Владелец
 * заводит характеристику одной модели — таблица вырастает на строку сама,
 * отсутствующее значение приходит прочерком.
 *
 * Сравнивать нечего — секции нет: пустая таблица с одними прочерками хуже,
 * чем её отсутствие.
 *
 * Последняя строка — цена под ключ, как в макете. Она не характеристика и в
 * объединение ключей не входит: значение берёт тот же `getActivePrice`, что и
 * карточка, — цена в витрине и в сравнении обязана совпадать до рубля.
 */
export function CompareTable({ products, now }: CompareTableProps) {
  const table = buildCompareTable(products);
  if (table.rows.length === 0) return null;

  const minWidth = `${SPEC_COLUMN_PX + table.products.length * VALUE_COLUMN_PX}px`;

  return (
    <Card padding="none" className={styles.panel}>
      <div className={styles.head}>
        <h3 className={styles.title}>{catalogText.compareTitle}</h3>
        <Badge variant="accent" size="sm" mono>
          {catalogText.compareSource}
        </Badge>
      </div>

      <Table
        variant="sticky"
        zebra
        minWidth={minWidth}
        label={catalogText.compareScrollHint}
        className={styles.table}
      >
        <thead>
          <tr>
            <th scope="col">{catalogText.compareSpec}</th>
            {table.products.map((product) => (
              <th key={product.id} scope="col">
                {product.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.key}</th>
              {row.values.map((value, index) => (
                <td key={table.products[index]?.id ?? index}>{value}</td>
              ))}
            </tr>
          ))}
          <tr className={styles.priceRow}>
            <th scope="row">{catalogText.comparePrice}</th>
            {table.products.map((product) => (
              <td key={product.id}>{formatMoney(getActivePrice(product, now).currentPrice)}</td>
            ))}
          </tr>
        </tbody>
      </Table>

      <p className={styles.note}>{catalogText.compareNote}</p>
    </Card>
  );
}
