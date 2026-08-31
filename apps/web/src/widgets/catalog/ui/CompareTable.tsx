import { Fragment } from 'react';

import { Card, Table } from '@/shared/ui';
import { buildCompareTable } from '@/entities/product/lib/buildCompareTable';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { EMPTY_SPEC_DICTIONARY, type SpecDictionary } from '@/entities/product/lib/groupSpecs';
import { formatMoney } from '@/shared/lib/format';
import { catalogText } from '../content';
import type { CatalogProduct } from '../model';
import styles from './CompareTable.module.css';

/**
 * 🔴 Пол ширины таблицы (issue #263). Три модели плюс колонка характеристик —
 * это минимум 620px, а экран на телефоне 343: свернуть таблицу не во что,
 * поэтому она едет внутри своего контейнера, а не жмётся до нечитаемого.
 *
 * Именно пол, а не расчёт по числу колонок: ширину колонок задаёт содержимое
 * (значения не переносятся), и таблица растёт сама. Прежняя формула
 * «200 + 160 × модели» назначала ширину мимо содержимого и на длинных
 * значениях всё равно оказывалась мала.
 */
const MIN_TABLE_WIDTH = '620px';

export interface CompareTableProps {
  /**
   * Модели, отмеченные клиентом, в порядке адреса (ADR-109). Их приносит
   * страница: таблица ничего не отбирает сама, она рисует чужой выбор.
   */
  products: readonly CatalogProduct[];
  /** Момент расчёта скидки — тот же, что у карточек: цена не смеет разойтись. */
  now?: Date | undefined;
  /** Справочник задаёт порядок строк и разбивает их на группы (ADR-094). */
  specDictionary?: SpecDictionary | undefined;
}

/**
 * Таблица сравнения отмеченных моделей.
 *
 * 🔴 Список строк не задан в разметке: это объединение ключей `specs` всех
 * сравниваемых моделей, которое считает `buildCompareTable` (инвариант 6).
 * Владелец заводит характеристику одной модели — таблица вырастает на строку
 * сама, отсутствующее значение приходит прочерком.
 *
 * Потолка на число колонок нет: лишние уходят в горизонтальную прокрутку
 * внутри `Table` (вариант `sticky` — первая колонка залипает, иначе на
 * четвёртой модели непонятно, чьё это значение).
 *
 * Последняя строка — цена под ключ, как в макете. Она не характеристика и в
 * объединение ключей не входит: значение берёт тот же `getActivePrice`, что и
 * карточка, — цена в витрине и в сравнении обязана совпадать до рубля. Она же
 * оставляет таблице смысл, когда характеристик не заполнено ни у кого.
 */
export function CompareTable({
  products,
  now,
  specDictionary = EMPTY_SPEC_DICTIONARY,
}: CompareTableProps) {
  const table = buildCompareTable(products, undefined, specDictionary);
  if (table.products.length === 0) return null;

  const columnCount = table.products.length + 1;

  return (
    <Card padding="none" elevation="none" className={styles.panel}>
      <Table
        variant="sticky"
        zebra
        fade
        minWidth={MIN_TABLE_WIDTH}
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
          {/* 🔴 Цена под ключ идёт первой строкой: ради неё таблицу и
              открывают. Характеристикой она не является и в объединение
              ключей `specs` не входит — значение берёт тот же
              `getActivePrice`, что и карточка, чтобы цена в витрине и в
              сравнении не разошлась до рубля. Она же оставляет таблице смысл,
              когда характеристик не заполнено ни у кого. */}
          <tr className={styles.priceRow}>
            <th scope="row">{catalogText.comparePrice}</th>
            {table.products.map((product) => (
              <td key={product.id}>{formatMoney(getActivePrice(product, now).currentPrice)}</td>
            ))}
          </tr>

          {table.rows.map((row, index) => {
            /* Заголовок группы рисуется перед её первой строкой. Группы
               приходят из справочника; характеристики вне его идут последними
               и заголовка не получают — «Прочее» над двумя строками читается
               как упрёк владельцу, а не как помощь читателю. */
            const groupChanged = row.group !== null && table.rows[index - 1]?.group !== row.group;

            return (
              <Fragment key={row.key}>
                {groupChanged ? (
                  <tr className={styles.groupRow}>
                    <th scope="colgroup" colSpan={columnCount}>
                      {/* 🔴 Липнет подпись, а не ячейка. Липкая ячейка не может
                          сдвинуться дальше своей строки, а эта растянута на всю
                          строку — двигаться ей некуда, и при прокрутке название
                          группы уезжало за левый край вместе с таблицей. */}
                      <span className={styles.groupLabel}>{row.group}</span>
                    </th>
                  </tr>
                ) : null}
                <tr>
                  <th scope="row">{row.key}</th>
                  {row.values.map((value, column) => (
                    <td key={table.products[column]?.id ?? column}>{value}</td>
                  ))}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </Table>

      <div className={styles.notes}>
        {/* Подсказка про жест: полосы прокрутки на телефоне не видно, а
            затухание края работает не на каждом движке. */}
        <p className={styles.swipe}>{catalogText.compareSwipeHint}</p>
        <p className={styles.note}>
          {table.rows.length === 0 ? catalogText.compareNoSpecs : catalogText.compareNote}
        </p>
      </div>
    </Card>
  );
}
