import Link from 'next/link';

import { Card, StatTile, StatTiles, Table } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import type { StaffOrder, StaffTotals } from './model';
import styles from './StaffPayouts.module.css';

export interface StaffPayoutsProps {
  readonly totals: StaffTotals;
  /** Наряды, из которых складываются движения: выплата и удержание по каждому. */
  readonly orders: readonly StaffOrder[];
}

/**
 * Выплаты и удержания монтажника (CRM.md §3.6, §9).
 *
 * 🔴 «Удержание», а не «штраф». Штрафов как вида взыскания в ТК РФ нет, а
 * удержания ограничены статьёй 137; уменьшение вознаграждения законно у
 * самозанятого и подрядчика по ГПХ, когда прописано в договоре (ADR-114).
 * Слова «штраф» нет ни в одной подписи этого экрана.
 *
 * 🔴 Удержанное не вычтено из заработанного, и плитка говорит об этом прямо:
 * вычитать или нет, решает договор с человеком, а не таблица.
 *
 * 🔴 У каждого удержания — основание и ссылка на наряд. Запись без основания
 * показывается как дефект данных, а не как пустая ячейка: молчащая строка
 * выглядела бы законной.
 *
 * Серверный компонент: клиентского JS здесь ноль.
 */
export function StaffPayouts({ totals, orders }: StaffPayoutsProps) {
  /* Движение есть там, где есть деньги: наряд без выплаты и без удержания в
     этой таблице не строка, а шум. */
  const moves = orders.filter((order) => order.fee > 0 || order.deduction > 0);

  return (
    <>
      <StatTiles label={texts.tilesLabel}>
        <StatTile label={texts.tileDone} value={String(totals.done)} />
        <StatTile label={texts.tileActive} value={String(totals.active)} />
        <StatTile
          label={texts.tileFee}
          value={texts.money(totals.feeDone)}
          note={texts.tileFeeNote}
        />
        <StatTile
          label={texts.tileHeld}
          value={texts.money(totals.deductions)}
          note={texts.tileHeldNote}
        />
      </StatTiles>

      <Card as="section" className={styles.card} padding="none">
        <header className={styles.header}>
          <h2 className={styles.title}>{texts.payoutsTitle}</h2>
          <p className={styles.hint}>{texts.payoutsHint}</p>
        </header>

        {moves.length === 0 ? (
          <p className={styles.empty}>{texts.payoutsEmpty}</p>
        ) : (
          /* 🔴 `cards` требует подписи в каждой ячейке и явных ролей: до 600px
             строка раскладывается карточкой через `display: block`, а он
             снимает с таблицы семантику (см. Table.tsx). Основание при этом
             видно целиком — ради него в таблицу и смотрят. */
          <Table variant="cards" zebra label={texts.payoutsTitle}>
            <thead>
              <tr role="row">
                <th scope="col">{texts.colOrder}</th>
                <th scope="col">{texts.colWhen}</th>
                <th scope="col">{texts.colClient}</th>
                <th scope="col" className={styles.numberHead}>
                  {texts.colFee}
                </th>
                <th scope="col" className={styles.numberHead}>
                  {texts.colHeld}
                </th>
                <th scope="col">{texts.colReason}</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((order) => (
                <tr key={order.id} role="row">
                  <td role="cell" data-label={texts.colOrder}>
                    <Link className={styles.order} href={{ pathname: `/admin/orders/${order.id}` }}>
                      {texts.orderNumber(order.number)}
                    </Link>
                  </td>
                  <td role="cell" data-label={texts.colWhen} className={styles.when}>
                    <time dateTime={order.at}>{texts.date(order.at)}</time>
                  </td>
                  <td role="cell" data-label={texts.colClient}>
                    {order.clientName}
                  </td>
                  <td role="cell" data-label={texts.colFee} className={styles.number}>
                    {texts.money(order.fee)}
                  </td>
                  <td role="cell" data-label={texts.colHeld} className={styles.number}>
                    {order.deduction === 0 ? texts.dash : texts.money(order.deduction)}
                  </td>
                  <td role="cell" data-label={texts.colReason} className={styles.reason}>
                    {order.deduction === 0
                      ? texts.dash
                      : (order.deductionReason ?? (
                          <span className={styles.missing}>{texts.reasonMissing}</span>
                        ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
