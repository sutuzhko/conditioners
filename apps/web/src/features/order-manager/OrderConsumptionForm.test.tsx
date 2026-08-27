import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderConsumptionForm } from './OrderConsumptionForm';
import { orderManagerContent as texts } from './content';
import { acceptingConsume, installerZones, stockHints, stockItems, stockZones } from './fixtures';
import type { StockUnit } from './model';

/**
 * Количество так, как его видит поиск по тексту: Testing Library схлопывает
 * неразрывные пробелы разметки в обычные, а строку-образец оставляет как есть.
 */
function qtyText(value: number, unit: StockUnit): string {
  return texts.qty(value, unit).replace(/\s/g, ' ');
}

/** Заполнение формы владельца: зона, позиция, количество. */
async function fill(zoneId: string, itemId: string, qty: string): Promise<void> {
  await userEvent.selectOptions(screen.getByLabelText(texts.consumeZone), zoneId);
  await userEvent.selectOptions(screen.getByLabelText(texts.consumeItem), itemId);
  await userEvent.type(screen.getByLabelText(texts.consumeQty), qty);
}

describe('Списание материала на наряд', () => {
  it('🔴 монтажнику зона не выбирается: она у него одна — его машина', () => {
    render(
      <OrderConsumptionForm
        items={stockItems}
        zones={installerZones}
        onSubmit={acceptingConsume}
      />,
    );

    expect(screen.queryByLabelText(texts.consumeZone)).not.toBeInTheDocument();
    expect(screen.getByText(texts.consumeZoneOnly('Газель'))).toBeInTheDocument();
  });

  it('единственная зона всё равно уезжает на сервер', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));

    render(<OrderConsumptionForm items={stockItems} zones={installerZones} onSubmit={onSubmit} />);

    await userEvent.selectOptions(screen.getByLabelText(texts.consumeItem), 's1');
    await userEvent.type(screen.getByLabelText(texts.consumeQty), '4');
    await userEvent.click(screen.getByRole('button', { name: texts.consumeSubmit }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        itemId: 's1',
        fromZoneId: 'z2',
        qty: 4,
        serials: null,
      }),
    );
  });

  it('«1,5» разбирается доменной схемой склада, а не спорит с клавиатурой', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));

    render(<OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={onSubmit} />);

    await fill('z2', 's3', '1,5');
    await userEvent.click(screen.getByRole('button', { name: texts.consumeSubmit }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        itemId: 's3',
        fromZoneId: 'z2',
        qty: 1.5,
        serials: null,
      }),
    );
  });

  it('🔴 уход в минус предупреждает, но не запрещает: списание уходит на сервер', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));

    render(<OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={onSubmit} />);

    await fill('z2', 's1', '30');

    expect(screen.getByText(texts.consumeShortfall(qtyText(18, 'meter')))).toBeInTheDocument();

    const button = screen.getByRole('button', { name: texts.consumeSubmit });
    expect(button).toBeEnabled();

    await userEvent.click(button);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('остаток по выбранной зоне виден до отправки', async () => {
    render(
      <OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={acceptingConsume} />,
    );

    await userEvent.selectOptions(screen.getByLabelText(texts.consumeZone), 'z1');
    await userEvent.selectOptions(screen.getByLabelText(texts.consumeItem), 's1');

    expect(screen.getByText(texts.consumeBalance(qtyText(43.5, 'meter')))).toBeInTheDocument();
  });

  it('серийные номера спрашиваются у техники и не спрашиваются у расходника', async () => {
    render(
      <OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={acceptingConsume} />,
    );

    await userEvent.selectOptions(screen.getByLabelText(texts.consumeItem), 's1');
    expect(screen.queryByLabelText(texts.consumeSerials)).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(texts.consumeItem), 's4');
    expect(screen.getByLabelText(texts.consumeSerials)).toBeInTheDocument();
  });

  it('пустая форма не отправляется, а подсказка встаёт у поля', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));

    render(<OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: texts.consumeSubmit }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(texts.consumeItem)).toBeInvalid();
  });

  it('сервер назвал поле — подсветка встаёт у него, а не общим сообщением', async () => {
    const onSubmit = vi.fn(async () => ({
      ok: false as const,
      message: 'Количество больше нуля',
      field: 'qty',
    }));

    render(<OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={onSubmit} />);

    await fill('z2', 's1', '4');
    await userEvent.click(screen.getByRole('button', { name: texts.consumeSubmit }));

    await waitFor(() => expect(screen.getByLabelText(texts.consumeQty)).toBeInvalid());
  });

  it('отказ без имени поля показывается сообщением', async () => {
    const onSubmit = vi.fn(async () => ({
      ok: false as const,
      message: 'Наряд закрыт — списывать на него больше нельзя',
    }));

    render(<OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={onSubmit} />);

    await fill('z2', 's1', '4');
    await userEvent.click(screen.getByRole('button', { name: texts.consumeSubmit }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Наряд закрыт — списывать на него больше нельзя',
    );
  });

  it('после успеха форма готова к следующей строке, а зона остаётся выбранной', async () => {
    render(
      <OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={acceptingConsume} />,
    );

    await fill('z2', 's1', '4');
    await userEvent.click(screen.getByRole('button', { name: texts.consumeSubmit }));

    expect(await screen.findByText(texts.consumeDone)).toBeInTheDocument();
    expect(screen.getByLabelText(texts.consumeQty)).toHaveValue('');
    expect(screen.getByLabelText(texts.consumeZone)).toHaveValue('z2');
  });

  it('поиск сужает справочник, не пряча уже выбранную позицию', async () => {
    render(
      <OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={acceptingConsume} />,
    );

    await userEvent.selectOptions(screen.getByLabelText(texts.consumeItem), 's1');
    await userEvent.type(screen.getByLabelText(texts.consumeSearch), 'фреон');

    expect(screen.getByRole('option', { name: 'Фреон R32' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Труба медная 1/4″' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Кронштейны наружного блока' })).toBeNull();
  });

  it('архивная позиция в выбор не попадает', () => {
    render(
      <OrderConsumptionForm items={stockItems} zones={stockZones} onSubmit={acceptingConsume} />,
    );

    expect(screen.queryByRole('option', { name: 'Короб ПВХ 60×60' })).toBeNull();
  });

  it('справочник пуст — форма объясняет, кто заводит позиции', () => {
    render(<OrderConsumptionForm items={[]} zones={stockZones} onSubmit={acceptingConsume} />);

    expect(screen.getByText(texts.consumeItemsEmpty)).toBeInTheDocument();
  });

  it('🔴 подсказка чеклиста подставляет позицию — это ускоритель, а не единственный путь', async () => {
    render(
      <OrderConsumptionForm
        items={stockItems}
        zones={stockZones}
        hints={stockHints}
        onSubmit={acceptingConsume}
      />,
    );

    /* Рядом с кнопкой виден сам пункт сборов — человек узнаёт свою строку. */
    expect(screen.getByText('Забрать со склада — Позиция 1, Сплит-система 09')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: texts.consumeHintLabel('Сплит-система 09') }),
    );

    expect(screen.getByLabelText(texts.consumeItem)).toHaveValue('s4');
    /* Техника — значит, форма тут же спросила серийные номера. */
    expect(screen.getByLabelText(texts.consumeSerials)).toBeInTheDocument();
  });
});
