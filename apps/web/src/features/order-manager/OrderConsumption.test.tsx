import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderConsumption } from './OrderConsumption';
import { orderManagerContent as texts } from './content';
import {
  acceptingConsumptionApi,
  brokenConsumptionApi,
  consumptionMoves,
  emptyConsumptionApi,
  failingConsumptionApi,
  installerConsumptionApi,
  minusConsumptionApi,
  pendingConsumptionApi,
  stockChecklist,
  stockItems,
  zonelessConsumptionApi,
} from './fixtures';
import {
  consumptionHints,
  consumptionShortfall,
  consumptionTotals,
  findStockItem,
  negativeBalances,
  zoneBalance,
  type StockMovementCard,
  type StockUnit,
} from './model';

const yes = async (): Promise<boolean> => true;

/**
 * Количество так, как его видит поиск по тексту: Testing Library схлопывает
 * неразрывные пробелы разметки в обычные, а строку-образец оставляет как есть.
 */
function qtyText(value: number, unit: StockUnit): string {
  return texts.qty(value, unit).replace(/\s/g, ' ');
}

describe('Расход материалов по наряду', () => {
  it('пока склад отвечает, показывается каркас, а не «Загрузка…»', () => {
    render(<OrderConsumption orderId="o1" api={pendingConsumptionApi} confirmReturn={yes} />);

    expect(screen.getByLabelText(texts.consumptionBusy)).toHaveAttribute('aria-busy', 'true');
  });

  it('склад не ответил — блок предлагает повторить, а не показывает пустоту', async () => {
    render(<OrderConsumption orderId="o1" api={brokenConsumptionApi} confirmReturn={yes} />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.consumptionRetry })).toBeInTheDocument();
  });

  it('ничего не списано — блок объясняет зачем, а не рисует пустую таблицу', async () => {
    render(<OrderConsumption orderId="o1" api={emptyConsumptionApi} confirmReturn={yes} />);

    expect(await screen.findByText(texts.consumptionEmpty)).toBeInTheDocument();
    expect(screen.getByText(texts.consumptionEmptyText)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('строка показывает позицию, количество, зону и автора', async () => {
    render(<OrderConsumption orderId="o1" api={acceptingConsumptionApi} confirmReturn={yes} />);

    /* Ищем в журнале: те же названия и числа есть в форме и в итоге. */
    const log = within(await screen.findByRole('table'));

    expect(log.getByText('Труба медная 1/4″')).toBeInTheDocument();
    expect(log.getByText(qtyText(4, 'meter'))).toBeInTheDocument();
    expect(log.getAllByText('Газель')).not.toHaveLength(0);
    expect(log.getAllByText('Дмитрий Соколов')).not.toHaveLength(0);
  });

  it('удалённый автор не стирает запись, а подписывается словами', async () => {
    render(<OrderConsumption orderId="o1" api={acceptingConsumptionApi} confirmReturn={yes} />);

    expect(await screen.findByText(texts.consumptionAuthorless)).toBeInTheDocument();
  });

  it('серийные номера техники видны прямо в строке', async () => {
    render(<OrderConsumption orderId="o1" api={acceptingConsumptionApi} confirmReturn={yes} />);

    expect(await screen.findByText(texts.consumptionSerials('SN-4412-8890'))).toBeInTheDocument();
  });

  it('🔴 возврат стоит в журнале отдельной строкой и сам вернуться не предлагает', async () => {
    render(<OrderConsumption orderId="o1" api={acceptingConsumptionApi} confirmReturn={yes} />);

    expect(await screen.findByText(texts.consumptionReturnMark)).toBeInTheDocument();
    /* Кронштейны есть и в списании, и в возврате — кнопка остаётся ровно одна. */
    expect(
      screen.getAllByRole('button', {
        name: texts.consumptionReturnLabel('Кронштейны наружного блока'),
      }),
    ).toHaveLength(1);
  });

  it('🔴 отмена ошибочного списания уходит возвратом по номеру движения', async () => {
    const cancel = vi.fn(async () => ({ ok: true as const }));
    const api = { ...acceptingConsumptionApi, cancel };

    render(<OrderConsumption orderId="o1" api={api} confirmReturn={yes} />);

    const button = await screen.findByRole('button', {
      name: texts.consumptionReturnLabel('Труба медная 1/4″'),
    });
    await userEvent.click(button);

    await waitFor(() => expect(cancel).toHaveBeenCalledWith('m1'));
  });

  it('отказ на возврате объясняется, а список остаётся на месте', async () => {
    render(<OrderConsumption orderId="o1" api={failingConsumptionApi} confirmReturn={yes} />);

    const button = await screen.findByRole('button', {
      name: texts.consumptionReturnLabel('Труба медная 1/4″'),
    });
    await userEvent.click(button);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByText('Труба медная 1/4″')).not.toHaveLength(0);
  });

  it('итог считает списания за вычетом возвратов', async () => {
    render(<OrderConsumption orderId="o1" api={acceptingConsumptionApi} confirmReturn={yes} />);

    const totals = within(
      await screen.findByRole('region', { name: texts.consumptionTotalsTitle }),
    );

    /* Два кронштейна списаны, один возвращён — по факту израсходована пара. */
    expect(totals.getByText(qtyText(1, 'pair'))).toBeInTheDocument();
  });

  it('🔴 минус на складе предупреждает и зовёт провести инвентаризацию', async () => {
    render(<OrderConsumption orderId="o1" api={minusConsumptionApi} confirmReturn={yes} />);

    expect(await screen.findByText(texts.consumptionMinusTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.consumptionMinusText)).toBeInTheDocument();
  });

  it('🔴 монтажнику видна только его машина: зон компании нет ни в форме, ни на экране', async () => {
    render(<OrderConsumption orderId="o1" api={installerConsumptionApi} confirmReturn={yes} />);

    expect(await screen.findByText(texts.consumeZoneOnly('Газель'))).toBeInTheDocument();
    expect(screen.queryByLabelText(texts.consumeZone)).not.toBeInTheDocument();
    expect(screen.queryByText('Гараж')).not.toBeInTheDocument();
  });

  it('зон хранения нет — форма не рисуется, а объясняет, почему списывать неоткуда', async () => {
    render(<OrderConsumption orderId="o1" api={zonelessConsumptionApi} confirmReturn={yes} />);

    expect(await screen.findByText(texts.consumeZonesEmpty)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.consumeSubmit })).not.toBeInTheDocument();
  });

  it('удачное списание перечитывает расход: остаток обязан быть новым', async () => {
    const load = vi.fn(acceptingConsumptionApi.load);
    const api = { ...acceptingConsumptionApi, load };

    render(
      <OrderConsumption orderId="o1" checklist={stockChecklist} api={api} confirmReturn={yes} />,
    );

    await screen.findAllByText('Труба медная 1/4″');
    expect(load).toHaveBeenCalledTimes(1);

    await userEvent.selectOptions(screen.getByLabelText(texts.consumeZone), 'z2');
    await userEvent.selectOptions(screen.getByLabelText(texts.consumeItem), 's1');
    await userEvent.type(screen.getByLabelText(texts.consumeQty), '4');
    await userEvent.click(screen.getByRole('button', { name: texts.consumeSubmit }));

    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
});

describe('Расход материалов: подсчёты', () => {
  it('итог гасит списание встречным возвратом', () => {
    const totals = consumptionTotals(consumptionMoves);

    expect(totals).toEqual([
      { itemId: 's1', name: 'Труба медная 1/4″', unit: 'meter', qty: 4 },
      { itemId: 's4', name: 'Сплит-система 09', unit: 'piece', qty: 1 },
      { itemId: 's2', name: 'Кронштейны наружного блока', unit: 'pair', qty: 1 },
    ]);
  });

  it('списанное и возвращённое целиком в итог не попадает', () => {
    const consumed = consumptionMoves.filter((move) => move.item.id === 's1');
    const returned: readonly StockMovementCard[] = consumed.map((move) => ({
      ...move,
      id: `${move.id}-back`,
      kind: 'return',
      fromZone: null,
      toZone: { id: 'z2', name: 'Газель' },
    }));

    expect(consumptionTotals([...consumed, ...returned])).toHaveLength(0);
  });

  it('🔴 остаток чужой зоны — это ноль, а не сбой: ключа в ответе просто нет', () => {
    expect(zoneBalance(findStockItem(stockItems, 's1'), 'z9')).toBe(0);
    expect(zoneBalance(undefined, 'z1')).toBe(0);
  });

  it('нехватка считается по зоне списания, а не по общему остатку', () => {
    const item = findStockItem(stockItems, 's1');

    /* В машине двенадцать метров, всего по складу — пятьдесят пять с половиной. */
    expect(consumptionShortfall(item, 'z2', 30)).toBe(18);
    expect(consumptionShortfall(item, 'z1', 30)).toBe(0);
    expect(consumptionShortfall(item, 'z2', null)).toBe(0);
  });

  it('🔴 минус находится по справочнику: расхождение переживает форму', () => {
    expect(negativeBalances(consumptionMoves, stockItems)).toHaveLength(0);

    const short = stockItems.map((item) =>
      item.id === 's1' ? { ...item, byZone: { z1: 43.5, z2: -3.5 }, total: 40 } : item,
    );
    expect(negativeBalances(consumptionMoves, short)).toHaveLength(1);
  });

  it('подсказки связывают пункт сборов с позицией склада и пропускают архив', () => {
    const hints = consumptionHints(stockChecklist, stockItems);

    expect(hints.map((hint) => hint.itemId)).toEqual(['s2', 's4']);
  });

  it('без совпадений подсказок нет — форма работает и так', () => {
    expect(consumptionHints([], stockItems)).toHaveLength(0);
  });
});
