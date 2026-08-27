import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StockZoneForm } from './StockZoneForm';
import { STOCK_ZONE_KIND_TITLES, stockManagerContent as texts } from './content';
import { acceptingApi, people, van } from './fixtures';
import { zoneDraftOf } from './model';

describe('Форма зоны хранения', () => {
  it('у склада поля хозяина нет вовсе: он общий', () => {
    render(<StockZoneForm people={people} />);

    expect(screen.queryByLabelText(texts.zoneUser)).not.toBeInTheDocument();
    expect(screen.getByText(texts.zoneUserNone)).toBeVisible();
  });

  it('у машины появляется выбор человека', async () => {
    const user = userEvent.setup();
    render(<StockZoneForm people={people} />);

    await user.selectOptions(screen.getByLabelText(texts.zoneKind), 'van');

    expect(screen.getByLabelText(texts.zoneUser)).toBeVisible();
  });

  it('🔴 машина без хозяина на сервер не уезжает: интерфейс не даёт ввести неверное', async () => {
    const user = userEvent.setup();
    const createZone = vi.fn(async () => ({ ok: true }) as const);

    render(<StockZoneForm api={{ ...acceptingApi, createZone }} people={people} />);

    await user.selectOptions(screen.getByLabelText(texts.zoneKind), 'van');
    await user.type(screen.getByLabelText(texts.zoneName), 'Газель');
    await user.click(screen.getByRole('button', { name: texts.zoneAdd }));

    expect(createZone).not.toHaveBeenCalled();
    expect(await screen.findByText('Выберите, чья это машина')).toBeVisible();
  });

  it('🔴 хозяин не остаётся в состоянии после переключения на склад', async () => {
    const user = userEvent.setup();
    const createZone = vi.fn(async () => ({ ok: true }) as const);

    render(<StockZoneForm api={{ ...acceptingApi, createZone }} people={people} />);

    await user.selectOptions(screen.getByLabelText(texts.zoneKind), 'van');
    await user.selectOptions(screen.getByLabelText(texts.zoneUser), 'u2');
    await user.selectOptions(screen.getByLabelText(texts.zoneKind), 'warehouse');
    await user.type(screen.getByLabelText(texts.zoneName), 'Гараж на Демидовской');
    await user.click(screen.getByRole('button', { name: texts.zoneAdd }));

    expect(createZone).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'warehouse', userId: '' }),
    );
  });

  it('заводит машину с хозяином и очищает форму', async () => {
    const user = userEvent.setup();
    const createZone = vi.fn(async () => ({ ok: true }) as const);

    render(<StockZoneForm api={{ ...acceptingApi, createZone }} people={people} />);

    await user.selectOptions(screen.getByLabelText(texts.zoneKind), 'van');
    await user.type(screen.getByLabelText(texts.zoneName), 'Газель');
    await user.selectOptions(screen.getByLabelText(texts.zoneUser), 'u2');
    await user.click(screen.getByRole('button', { name: texts.zoneAdd }));

    expect(createZone).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'van', name: 'Газель', userId: 'u2' }),
    );
    expect(await screen.findByText(texts.zoneAdded)).toBeVisible();
  });

  it('правка существующей зоны шлёт её идентификатор', async () => {
    const user = userEvent.setup();
    const updateZone = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StockZoneForm
        api={{ ...acceptingApi, updateZone }}
        zoneId={van.id}
        initial={zoneDraftOf(van)}
        people={people}
      />,
    );

    expect(screen.getByLabelText(texts.zoneKind)).toHaveValue('van');
    expect(screen.getByLabelText(texts.zoneKind)).toHaveDisplayValue(STOCK_ZONE_KIND_TITLES.van);

    await user.click(screen.getByRole('button', { name: texts.zoneSave }));

    expect(updateZone).toHaveBeenCalledWith(van.id, zoneDraftOf(van));
  });

  it('отказ сервера объясняется словами и не теряет введённое', async () => {
    const user = userEvent.setup();

    render(
      <StockZoneForm
        api={{
          ...acceptingApi,
          createZone: async () => ({ ok: false, message: texts.serverError }),
        }}
        people={people}
      />,
    );

    await user.type(screen.getByLabelText(texts.zoneName), 'Гараж на Демидовской');
    await user.click(screen.getByRole('button', { name: texts.zoneAdd }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
    expect(screen.getByLabelText(texts.zoneName)).toHaveValue('Гараж на Демидовской');
  });
});
