import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CalendarStage } from './CalendarStage';
import { CalendarCreate } from './CalendarCreate';
import { EventChip } from './EventChip';
import { crmContent as texts } from './content';
import { plannedCall, viewerId } from './fixtures';
import { dayColumns } from './schedule';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const fetchMock = vi.fn();
const DAY = '2026-08-23';

/** Дело из фикстур в том виде, в каком его отдаёт раскладка. */
function eventItem() {
  const column = dayColumns(
    { events: [plannedCall], orders: [], leads: [], blocks: [], viewerId, today: DAY },
    DAY,
  )[0];

  const item = column?.timed[0]?.item;
  if (item === undefined || item.edit === null) throw new Error('дело не попало в сетку');
  return item;
}

function stage(children: React.ReactNode, confirmRemove?: () => Promise<boolean>) {
  return render(
    <CalendarStage day={DAY} viewerId={viewerId} confirmRemove={confirmRemove}>
      {children}
    </CalendarStage>,
  );
}

beforeEach(() => {
  refresh.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Управляющий слой календаря', () => {
  it('🔴 сетка приходит разметкой и остаётся на месте: слой её не собирает', () => {
    stage(<p>сетка часов</p>);

    expect(screen.getByText('сетка часов')).toBeInTheDocument();
  });

  it('«Новое дело» открывает форму на выбранный день', async () => {
    const user = userEvent.setup();
    stage(<CalendarCreate day={DAY} />);

    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(screen.getByRole('dialog', { name: texts.addTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.fieldDay))).toHaveValue(DAY);
  });

  it('🔴 длительность есть в форме: растягивание края — ускоритель, а не путь', async () => {
    const user = userEvent.setup();
    stage(<CalendarCreate day={DAY} />);

    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(screen.getByLabelText(new RegExp(texts.fieldDuration))).toHaveValue('60');
  });

  it('«Отметить занятость» открывает свою форму, а не форму дела (ADR-115)', async () => {
    const user = userEvent.setup();
    stage(<CalendarCreate day={DAY} canBlock />);

    await user.click(screen.getByRole('button', { name: texts.busyAdd }));

    expect(screen.getByRole('dialog', { name: texts.busyAddTitle })).toBeInTheDocument();
  });

  it('🔴 удаление подтверждается диалогом, а не окном браузера (ADR-113)', async () => {
    const user = userEvent.setup();
    const item = eventItem();
    const ask = vi.fn().mockResolvedValue(true);

    stage(<EventChip item={item} />, ask);

    await user.click(screen.getByRole('button', { name: item.label }));
    await user.click(screen.getByRole('button', { name: texts.remove }));

    await waitFor(() => expect(ask).toHaveBeenCalledWith(texts.removeConfirm));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/crm/${plannedCall.id}`,
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('отказ от подтверждения ничего не удаляет', async () => {
    const user = userEvent.setup();
    const item = eventItem();
    const ask = vi.fn().mockResolvedValue(false);

    stage(<EventChip item={item} />, ask);

    await user.click(screen.getByRole('button', { name: item.label }));
    await user.click(screen.getByRole('button', { name: texts.remove }));

    await waitFor(() => expect(ask).toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('🔴 изменение объявляется словами: сетка перерисовывается молча', async () => {
    const user = userEvent.setup();
    const item = eventItem();
    const ask = vi.fn().mockResolvedValue(true);

    stage(<EventChip item={item} />, ask);

    await user.click(screen.getByRole('button', { name: item.label }));
    await user.click(screen.getByRole('button', { name: texts.remove }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(texts.removedNote));
  });
});
