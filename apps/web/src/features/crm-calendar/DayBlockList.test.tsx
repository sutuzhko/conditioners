import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DayBlockList } from './DayBlockList';
import { crmContent as texts } from './content';
import {
  doctorBlock,
  extraThursdayBlock,
  foreignBlock,
  monthBlocks,
  viewerId,
  weeklyBlock,
  wholeDayBlock,
} from './fixtures';

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

describe('Занятость дня', () => {
  it('день без занятости говорит об этом прямо, а не молчит', () => {
    render(<DayBlockList day="2026-08-25" blocks={monthBlocks} viewerId={viewerId} />);

    expect(screen.getByText(texts.busyEmpty)).toBeInTheDocument();
  });

  it('закрытый целиком день показывает причину', () => {
    render(<DayBlockList day="2026-08-26" blocks={[wholeDayBlock]} viewerId={viewerId} />);

    expect(screen.getByText(wholeDayBlock.reason ?? '')).toBeInTheDocument();
  });

  it('занятость часами показывает промежуток, а не «весь день»', () => {
    render(<DayBlockList day="2026-08-24" blocks={[doctorBlock]} viewerId={viewerId} />);

    expect(screen.getByText('14:00–16:00')).toBeInTheDocument();
  });

  it('повторяемая занятость попадает в день недели и говорит, что повторяется', () => {
    render(<DayBlockList day="2026-08-27" blocks={[weeklyBlock]} viewerId={viewerId} />);

    expect(screen.getByText(new RegExp(texts.busyRepeatNote))).toHaveTextContent('Четверг');
  });

  it('несколько записей на один день показываются все', () => {
    render(<DayBlockList day="2026-08-20" blocks={monthBlocks} viewerId={viewerId} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(extraThursdayBlock.reason ?? '')).toBeInTheDocument();
    expect(screen.getByText(weeklyBlock.reason ?? '')).toBeInTheDocument();
  });

  it('🔴 чужую занятость видно, но снять её нечем: это чужой выходной', () => {
    render(<DayBlockList day="2026-08-23" blocks={[foreignBlock]} viewerId={viewerId} />);

    expect(screen.getByText(foreignBlock.userName ?? '')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.busyDrop })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.busyEdit })).not.toBeInTheDocument();
  });

  it('свою занятость правит сам: кнопки на месте', () => {
    render(<DayBlockList day="2026-08-26" blocks={[wholeDayBlock]} viewerId={viewerId} />);

    expect(screen.getByRole('button', { name: texts.busyEdit })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.busyDrop })).toBeInTheDocument();
  });

  it('снятие спрашивает подтверждение и без него ничего не делает', async () => {
    const user = userEvent.setup();
    render(
      <DayBlockList
        day="2026-08-26"
        blocks={[wholeDayBlock]}
        viewerId={viewerId}
        confirmRemove={async () => false}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.busyDrop }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('подтверждённое снятие уходит на сервер и обновляет страницу', async () => {
    const user = userEvent.setup();
    render(
      <DayBlockList
        day="2026-08-26"
        blocks={[wholeDayBlock]}
        viewerId={viewerId}
        confirmRemove={async () => true}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.busyDrop }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/blocks/${wholeDayBlock.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('неудачу снятия показывает текстом, а не молча теряет нажатие', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => null });
    const user = userEvent.setup();
    render(
      <DayBlockList
        day="2026-08-26"
        blocks={[wholeDayBlock]}
        viewerId={viewerId}
        confirmRemove={async () => true}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.busyDrop }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.busyRemoveFailure);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('форма правки открывается заполненной — часы не набирают заново', async () => {
    const user = userEvent.setup();
    render(<DayBlockList day="2026-08-24" blocks={[doctorBlock]} viewerId={viewerId} />);

    await user.click(screen.getByRole('button', { name: texts.busyEdit }));

    expect(await screen.findByRole('dialog')).toHaveAccessibleName(texts.busyEditTitle);
    expect(screen.getByLabelText(new RegExp(texts.fieldFrom))).toHaveValue('14:00');
    expect(screen.getByLabelText(new RegExp(texts.fieldTo))).toHaveValue('16:00');
    expect(screen.getByLabelText(new RegExp(texts.fieldReason))).toHaveValue('Врач');
  });

  it('новая занятость открывается на выбранный день и на весь день', async () => {
    const user = userEvent.setup();
    render(<DayBlockList day="2026-08-25" blocks={[]} viewerId={viewerId} />);

    await user.click(screen.getByRole('button', { name: texts.busyAdd }));

    expect(await screen.findByRole('dialog')).toHaveAccessibleName(texts.busyAddTitle);
    expect(screen.getByLabelText(new RegExp(texts.fieldDay))).toHaveValue('2026-08-25');
    expect(screen.getByLabelText(texts.fieldAllDay)).toBeChecked();
  });
});
