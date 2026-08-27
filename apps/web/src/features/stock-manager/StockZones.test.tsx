import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StockZones } from './StockZones';
import { STOCK_ZONE_KIND_TITLES, stockManagerContent as texts } from './content';
import { acceptingApi, archivedZone, orphanZone, people, van, warehouse, zones } from './fixtures';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

describe('Зоны хранения', () => {
  it('показывает зоны и их природу', () => {
    render(<StockZones zones={zones} people={people} />);

    expect(screen.getByText(warehouse.name)).toBeVisible();
    expect(screen.getByText(van.name)).toBeVisible();
    expect(screen.getAllByText(STOCK_ZONE_KIND_TITLES.van)).toHaveLength(2);
    expect(screen.getByText(texts.zoneOwnerLine('Дмитрий Соколов'))).toBeVisible();
  });

  it('🔴 пустой раздел объясняет, что заводят сначала, и ничего не придумывает', () => {
    render(<StockZones zones={[]} people={people} />);

    expect(screen.getByText(texts.zonesEmpty)).toBeVisible();
    expect(screen.queryByText(warehouse.name)).not.toBeInTheDocument();
  });

  it('машина без хозяина помечена: монтажник не увидит её иначе', () => {
    render(<StockZones zones={[orphanZone]} people={people} />);

    expect(screen.getByText(texts.zoneOwnerLost)).toBeVisible();
  });

  it('🔴 архив спрашивает окном панели и не удаляет движений', async () => {
    const user = userEvent.setup();
    const archiveZone = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StockZones zones={[warehouse]} people={people} api={{ ...acceptingApi, archiveZone }} />,
    );

    await user.click(screen.getByRole('button', { name: texts.zoneArchive }));

    const request = texts.zoneArchiveConfirm(warehouse.name);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(request.title);

    await user.click(within(dialog).getByRole('button', { name: request.confirmLabel }));
    await waitFor(() => expect(archiveZone).toHaveBeenCalledWith(warehouse.id));
  });

  it('зона из архива возвращается правкой', async () => {
    const user = userEvent.setup();
    const updateZone = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StockZones zones={[archivedZone]} people={people} api={{ ...acceptingApi, updateZone }} />,
    );

    expect(screen.getByText(texts.zoneInArchive)).toBeVisible();
    await user.click(screen.getByRole('button', { name: texts.zoneRestore }));

    await waitFor(() =>
      expect(updateZone).toHaveBeenCalledWith(
        archivedZone.id,
        expect.objectContaining({ archived: false }),
      ),
    );
  });

  it('🔴 заведение зоны — окно с собственным адресом, а не форма под списком', () => {
    render(<StockZones zones={zones} people={people} />);

    expect(screen.getByRole('link', { name: texts.zoneAdd })).toHaveAttribute(
      'href',
      '/admin/stock/zones/new',
    );
    /* Форма не разворачивается на месте: список зон под ней не уезжает. */
    expect(screen.queryByLabelText(texts.zoneKind)).not.toBeInTheDocument();
  });

  it('правка открывается на месте строки, а не уводит со страницы', async () => {
    const user = userEvent.setup();
    render(<StockZones zones={[van]} people={people} />);

    await user.click(screen.getByRole('button', { name: texts.zoneEdit }));

    expect(screen.getByRole('heading', { name: texts.zoneEditTitle })).toBeVisible();
    expect(screen.getByLabelText(texts.zoneName)).toHaveValue(van.name);
  });

  it('отказ сервера объясняется словами', async () => {
    const user = userEvent.setup();

    render(
      <StockZones
        zones={[warehouse]}
        people={people}
        api={{
          ...acceptingApi,
          archiveZone: async () => ({ ok: false, message: texts.serverError }),
        }}
        confirmArchive={async () => true}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.zoneArchive }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
  });
});
