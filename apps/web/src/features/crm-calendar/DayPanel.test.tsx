import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DayPanel } from './DayPanel';
import { crmContent as texts } from './content';
import { dayLead, plannedCall, plannedInstall } from './fixtures';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: vi.fn() }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  refresh.mockClear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('День календаря', () => {
  it('пустой день объясняет, что делать, а не молчит', () => {
    render(<DayPanel day="2026-08-24" events={[]} leads={[]} />);

    expect(screen.getByText(texts.dayEmpty)).toBeInTheDocument();
    expect(screen.getByText(texts.dayEmptyHint)).toBeInTheDocument();
  });

  it('показывает время в московском поясе, а не в UTC', () => {
    render(<DayPanel day="2026-08-23" events={[plannedCall]} leads={[]} />);

    // 07:00 UTC — это 10:00 в Туле
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('телефон — ссылка на набор: дела закрывают звонком', () => {
    render(<DayPanel day="2026-08-23" events={[plannedCall]} leads={[]} />);

    expect(screen.getByRole('link', { name: plannedCall.clientPhone ?? '' })).toHaveAttribute(
      'href',
      `tel:${plannedCall.clientPhone}`,
    );
  });

  it('«Сделано» закрывает дело одним нажатием, без открытия формы', async () => {
    const user = userEvent.setup();
    render(<DayPanel day="2026-08-23" events={[plannedCall]} leads={[]} />);

    await user.click(screen.getByRole('button', { name: texts.markDone }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/crm/${plannedCall.id}`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'done' }) }),
    );
  });

  it('неудачу показывает текстом, а не молча теряет нажатие', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => null });
    const user = userEvent.setup();
    render(<DayPanel day="2026-08-23" events={[plannedCall]} leads={[]} />);

    await user.click(screen.getByRole('button', { name: texts.markDone }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.failure);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('удаление спрашивает подтверждение и без него ничего не делает', async () => {
    const user = userEvent.setup();
    render(
      <DayPanel
        day="2026-08-23"
        events={[plannedCall]}
        leads={[]}
        confirmRemove={async () => false}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('🔴 подтверждение спрашивается окном панели, а не системным confirm', async () => {
    const user = userEvent.setup();
    render(<DayPanel day="2026-08-23" events={[plannedCall]} leads={[]} />);

    await user.click(screen.getByRole('button', { name: texts.remove }));

    // системное окно нельзя оформить и в нём нельзя объяснить последствия
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(texts.removeConfirm.title);
    expect(
      screen.getByRole('button', { name: texts.removeConfirm.confirmLabel }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('форма правки открывается заполненной — данные не набирают заново', async () => {
    const user = userEvent.setup();
    render(<DayPanel day="2026-08-23" events={[plannedInstall]} leads={[]} />);

    await user.click(screen.getByRole('button', { name: texts.edit }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.fieldName))).toHaveValue('Сергей');
    expect(screen.getByLabelText(new RegExp(texts.fieldAddress))).toHaveValue(
      plannedInstall.address ?? '',
    );
    expect(screen.getByLabelText(new RegExp(texts.fieldTime))).toHaveValue('13:30');
  });

  it('заявки дня показываются отдельно и ведут в свой раздел', () => {
    render(<DayPanel day="2026-08-23" events={[]} leads={[dayLead]} />);

    expect(screen.getByText(texts.leadsTitle)).toBeInTheDocument();
    expect(screen.getByText(dayLead.name)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: texts.leadLink })).toHaveAttribute(
      'href',
      '/admin/leads',
    );
  });

  it('дело из заявки открывает форму сразу — за этим по ссылке и приходят', async () => {
    render(
      <DayPanel
        day="2026-08-23"
        events={[]}
        leads={[]}
        preset={{ clientName: 'Ирина', clientPhone: '+7 (900) 123-45-67' }}
      />,
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.fieldName))).toHaveValue('Ирина');
  });
});
