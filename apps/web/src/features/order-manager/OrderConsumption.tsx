'use client';

import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Card, Skeleton, Table, useConfirm, type Confirm } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import { orderConsumptionApi } from './lib';
import {
  consumptionHints,
  consumptionTotals,
  negativeBalances,
  type ConsumptionLine,
  type OrderChecklistCard,
  type OrderConsumptionApi,
  type OrderResult,
  type StockDirectory,
  type StockMovementCard,
} from './model';
import { OrderConsumptionForm } from './OrderConsumptionForm';
import styles from './OrderConsumption.module.css';

export interface OrderConsumptionProps {
  readonly orderId: string;
  /** Чеклист выезда: из него собираются подсказки к форме списания. */
  readonly checklist?: readonly OrderChecklistCard[] | undefined;
  /** Запросы вынесены пропом: истории и тесты подставляют свои. */
  readonly api?: OrderConsumptionApi | undefined;
  /** Подтверждение выведено пропом: тесты и истории не открывают окно (ADR-113). */
  readonly confirmReturn?: Confirm | undefined;
}

type LoadState = 'loading' | 'ready' | 'error';

const EMPTY_STOCK: StockDirectory = { zones: [], items: [] };

/** Откуда ушло или куда вернулось: у списания это зона-источник, у возврата — цель. */
function zoneName(move: StockMovementCard): string {
  const zone = move.kind === 'return' ? move.toZone : move.fromZone;
  return zone?.name ?? texts.consumptionZoneless;
}

/**
 * Расход материалов по наряду — docs/CRM.md §11.6, docs/API.md §14.
 *
 * Чеклист выезда знает, что нужно на работу; склад отвечает, есть ли оно;
 * этот блок сводит одно с другим и списывает израсходованное по факту.
 *
 * 🔴 Роль решают не кнопки, а ответ сервера. Монтажнику приходит только его
 * машина и остаток по ней, владельцу — все зоны; порога заказа не приходит
 * ни тому, ни другому — блок его не читает вовсе (ADR-134). Отсюда правило:
 * рисуем ровно то, что пришло, и не падаем от отсутствующего ключа.
 *
 * 🔴 Отмена ошибочного списания — возврат на склад, а не удаление записи.
 * Журнал движений не переписывается: из него потом отвечают на вопрос, куда
 * делись тридцать метров трассы.
 *
 * Данные читаются с клиента, а не приходят со страницей: расход правится
 * прямо здесь, и после каждого списания страница должна показывать новый
 * остаток, не перезагружая наряд целиком.
 */
export function OrderConsumption({
  orderId,
  checklist = [],
  api,
  confirmReturn,
}: OrderConsumptionProps) {
  const { confirm, dialog } = useConfirm();
  const ask = confirmReturn ?? confirm;

  /* Мемо здесь не про скорость, а про стабильную ссылку: набор запросов уходит
     в зависимости эффекта, и новый объект на каждый рендер зациклил бы его. */
  const fallback = useMemo(() => orderConsumptionApi(orderId), [orderId]);
  const client = api ?? fallback;

  const [state, setState] = useState<LoadState>('loading');
  const [moves, setMoves] = useState<readonly StockMovementCard[]>([]);
  const [stock, setStock] = useState<StockDirectory>(EMPTY_STOCK);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  /* Счётчик перечитываний: списание и возврат меняют и движения, и остаток. */
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const result = await client.load();
      if (!alive) return;

      if (result.ok) {
        setMoves(result.moves);
        setStock(result.stock);
        setMessage('');
        setState('ready');
        return;
      }

      /* Уже показанный расход не стирается осечкой обновления: список,
         исчезнувший из-за оборванной сети, читается как «ничего не списано». */
      setMessage(result.message);
      setState((current) => (current === 'ready' ? 'ready' : 'error'));
    })();

    return () => {
      alive = false;
    };
  }, [client, reloads]);

  const refresh = (): void => setReloads((count) => count + 1);

  const consume = async (line: ConsumptionLine): Promise<OrderResult> => {
    const result = await client.consume(line);
    if (result.ok) refresh();
    return result;
  };

  const cancel = async (move: StockMovementCard): Promise<void> => {
    if (busy !== null) return;

    const confirmed = await ask({
      title: texts.consumptionReturnAsk,
      description: texts.consumptionReturnText,
      confirmLabel: texts.consumptionReturnConfirm,
    });
    if (!confirmed) return;

    setBusy(move.id);
    setMessage('');

    const result = await client.cancel(move.id);
    setBusy(null);

    if (result.ok) {
      refresh();
      return;
    }
    setMessage(result.message);
  };

  const totals = consumptionTotals(moves);
  const minus = negativeBalances(moves, stock.items);
  const hints = consumptionHints(checklist, stock.items);

  return (
    <Card as="section" aria-labelledby="order-consumption-title">
      <h2 className={styles.title} id="order-consumption-title">
        {texts.consumptionTitle}
      </h2>
      <p className={styles.hint}>{texts.consumptionHint}</p>

      {state === 'loading' ? (
        <div className={styles.skeleton} aria-busy="true" aria-label={texts.consumptionBusy}>
          <Skeleton variant="block" height="46px" />
          <Skeleton variant="block" height="46px" />
          <Skeleton variant="block" height="46px" />
        </div>
      ) : null}

      {state === 'error' ? (
        <div className={styles.failure}>
          <p className={styles.error} role="alert">
            {message === '' ? texts.consumptionLoadError : message}
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={refresh}>
            {texts.consumptionRetry}
          </Button>
        </div>
      ) : null}

      {state === 'ready' ? (
        <>
          {moves.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>{texts.consumptionEmpty}</p>
              <p className={styles.emptyText}>{texts.consumptionEmptyText}</p>
            </div>
          ) : (
            <>
              <Table variant="cards" label={texts.consumptionTableLabel} zebra>
                <thead>
                  <tr role="row">
                    <th scope="col">{texts.consumptionColItem}</th>
                    <th scope="col">{texts.consumptionColQty}</th>
                    <th scope="col">{texts.consumptionColZone}</th>
                    <th scope="col">{texts.consumptionColWho}</th>
                    <th scope="col">
                      <span className="srOnly">{texts.consumptionColAction}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {moves.map((move) => (
                    <tr key={move.id} role="row">
                      <td className={styles.item} role="cell" data-label={texts.consumptionColItem}>
                        <span className={styles.name}>{move.item.name}</span>

                        {/* Возврат остаётся в журнале отдельной строкой — он не
                            стирает списание, а гасит его встречной записью. */}
                        {move.kind === 'return' ? (
                          <Badge size="sm" variant="neutral">
                            {texts.consumptionReturnMark}
                          </Badge>
                        ) : null}

                        {move.serials === null ? null : (
                          <span className={styles.serials}>
                            {texts.consumptionSerials(move.serials)}
                          </span>
                        )}
                      </td>

                      <td className={styles.qty} role="cell" data-label={texts.consumptionColQty}>
                        {texts.qty(move.qty, move.item.unit)}
                      </td>

                      <td role="cell" data-label={texts.consumptionColZone}>
                        {zoneName(move)}
                      </td>

                      <td className={styles.who} role="cell" data-label={texts.consumptionColWho}>
                        <span>{move.authorName ?? texts.consumptionAuthorless}</span>
                        <span className={styles.when}>{texts.stamp(move.createdAt)}</span>
                      </td>

                      <td role="cell">
                        {move.kind === 'consume' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className={styles.undo}
                            disabled={busy !== null}
                            loading={busy === move.id}
                            aria-label={texts.consumptionReturnLabel(move.item.name)}
                            onClick={() => void cancel(move)}
                          >
                            {texts.consumptionReturn}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {totals.length === 0 ? null : (
                <section className={styles.totals} aria-labelledby="order-consumption-totals">
                  <p className={styles.totalsTitle} id="order-consumption-totals">
                    {texts.consumptionTotalsTitle}
                  </p>
                  <p className={styles.hint}>{texts.consumptionTotalsHint}</p>

                  <ul className={styles.totalsList}>
                    {totals.map((total) => (
                      <li className={styles.total} key={total.itemId}>
                        <span>{total.name}</span>
                        <b className={styles.totalQty}>{texts.qty(total.qty, total.unit)}</b>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {minus.length === 0 ? null : (
            <section className={styles.minus} aria-labelledby="order-consumption-minus">
              <p className={styles.minusTitle} id="order-consumption-minus">
                {texts.consumptionMinusTitle}
              </p>
              <p className={styles.minusText}>{texts.consumptionMinusText}</p>

              <ul className={styles.totalsList}>
                {minus.map((row) => (
                  <li className={styles.total} key={row.itemId}>
                    <span>{row.name}</span>
                    <b className={styles.totalQty}>{texts.qty(row.qty, row.unit)}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {message === '' ? null : (
            <p className={styles.error} role="alert">
              {message}
            </p>
          )}

          {stock.zones.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>{texts.consumeZonesEmpty}</p>
              <p className={styles.emptyText}>{texts.consumeZonesEmptyText}</p>
            </div>
          ) : (
            <OrderConsumptionForm
              items={stock.items}
              zones={stock.zones}
              hints={hints}
              onSubmit={consume}
            />
          )}
        </>
      ) : null}

      {dialog}
    </Card>
  );
}
