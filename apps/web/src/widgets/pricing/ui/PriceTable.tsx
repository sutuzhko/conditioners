import type { PriceRow } from '@/entities/price/model';
import { Badge, Table } from '@/shared/ui';
import { priceFrom, pricingText } from '../content';
import { sortedRows } from '../model';
import styles from './PriceTable.module.css';

export type PriceTableProps = {
  /** Строки прайса. Порядок задаёт владелец в админке. */
  readonly rows: readonly PriceRow[];
};

/**
 * Таблица цен на монтаж по классам мощности.
 *
 * Серверный компонент без единой строчки JavaScript: цены обязаны приходить
 * готовым HTML (инвариант 1) — их видит и робот, и человек с выключенным
 * скриптом.
 *
 * 🔴 На узких экранах строки превращаются в карточки (docs/DESIGN_BRIEF.md §6).
 * Перестроение делает CSS поверх одной и той же таблицы: два набора разметки
 * означали бы две цены в HTML на одну строку прайса. Сам `<table>` остаётся
 * таблицей — переключаются только группы, строки и ячейки, — иначе браузер
 * потерял бы табличную семантику целиком. Роли строк и ячеек проставлены явно
 * по той же причине, а подписи колонок в карточном виде — настоящий текст, а
 * не `content: attr()`: псевдоэлемент вслух не читается, а шапка тут скрыта.
 */
export function PriceTable({ rows }: PriceTableProps) {
  return (
    <div className={styles.wrap}>
      <Table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th scope="col" className={styles.th}>
              {pricingText.colClass}
            </th>
            <th scope="col" className={styles.th}>
              {pricingText.colPower}
            </th>
            <th scope="col" className={styles.th}>
              {pricingText.colPrice}
            </th>
            <th scope="col" className={styles.th}>
              {pricingText.colTerm}
            </th>
          </tr>
        </thead>
        <tbody className={styles.tbody} role="rowgroup">
          {sortedRows(rows).map((row) => (
            <tr key={row.cls} className={styles.row} role="row">
              <th scope="row" className={styles.clsCell} role="rowheader">
                <Badge variant="accent" mono>
                  {row.cls}
                </Badge>
              </th>
              <td className={styles.powerCell} role="cell">
                <span className={styles.label}>{pricingText.colPower}</span>
                <span className={styles.power}>{row.power}</span>
                <span className={styles.area}>{row.area}</span>
              </td>
              <td className={styles.priceCell} role="cell">
                <span className={styles.label}>{pricingText.colPrice}</span>
                <span className={styles.price}>{priceFrom(row.price)}</span>
              </td>
              <td className={styles.termCell} role="cell">
                <span className={styles.label}>{pricingText.colTerm}</span>
                <span className={styles.term}>{row.term}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
