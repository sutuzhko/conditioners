import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockDialog } from './BlockDialog';
import { REPEAT_TITLE, crmContent as texts } from './content';
import type { DayBlockDraft } from './model';

const fetchMock = vi.fn();

const draft: DayBlockDraft = {
  repeat: 'once',
  day: '2026-08-26',
  weekday: 3,
  allDay: true,
  from: '10:00',
  to: '12:00',
  reason: '',
};

function dialog(props: Partial<Parameters<typeof BlockDialog>[0]> = {}) {
  return render(
    <BlockDialog
      open
      onClose={props.onClose ?? vi.fn()}
      onSaved={props.onSaved ?? vi.fn()}
      draft={props.draft ?? draft}
      id={props.id}
    />,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Окно занятости', () => {
  it('в покое показывает выбранный день и «весь день»', () => {
    dialog();

    expect(screen.getByLabelText(new RegExp(texts.fieldDay))).toHaveValue('2026-08-26');
    expect(screen.getByLabelText(texts.fieldAllDay)).toBeChecked();
    expect(screen.queryByLabelText(new RegExp(texts.fieldFrom))).not.toBeInTheDocument();
  });

  it('снятая галочка «весь день» открывает часы', async () => {
    const user = userEvent.setup();
    dialog();

    await user.click(screen.getByLabelText(texts.fieldAllDay));

    expect(screen.getByLabelText(new RegExp(texts.fieldFrom))).toHaveValue('10:00');
    expect(screen.getByLabelText(new RegExp(texts.fieldTo))).toHaveValue('12:00');
  });

  it('повторяемая занятость меняет дату на день недели', async () => {
    const user = userEvent.setup();
    dialog();

    await user.selectOptions(screen.getByLabelText(texts.fieldRepeat), 'weekly');

    expect(screen.queryByLabelText(new RegExp(texts.fieldDay))).not.toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.fieldWeekday))).toHaveValue('3');
  });

  it('отправляет разовую занятость на весь день', async () => {
    const user = userEvent.setup();
    dialog();

    await user.type(screen.getByLabelText(new RegExp(texts.fieldReason)), 'Семейные дела');
    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/blocks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          repeat: 'once',
          day: '2026-08-26',
          weekday: null,
          fromMin: null,
          toMin: null,
          reason: 'Семейные дела',
        }),
      }),
    );
  });

  it('переводит часы в минуты от полуночи, а не заставляет считать человека', async () => {
    const user = userEvent.setup();
    dialog({ draft: { ...draft, allDay: false, from: '14:00', to: '16:00' } });

    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('"fromMin":840,"toMin":960');
  });

  it('повторяемая уходит днём недели, а не датой', async () => {
    const user = userEvent.setup();
    dialog({ draft: { ...draft, repeat: 'weekly', weekday: 3 } });

    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('"day":null,"weekday":3');
  });

  it('правка уходит на свой адрес, а не заводит вторую запись', async () => {
    const user = userEvent.setup();
    dialog({ id: 'b1' });

    await user.click(screen.getByRole('button', { name: texts.save }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/blocks/b1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('конец окна раньше начала не уходит на сервер — подсказка под полем', async () => {
    const user = userEvent.setup();
    dialog({ draft: { ...draft, allDay: false, from: '16:00', to: '14:00' } });

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByText('Конец окна должен быть позже начала')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('успех подтверждается словами, а не молчаливым закрытием', async () => {
    const onSaved = vi.fn();
    const user = userEvent.setup();
    dialog({ onSaved });

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByText(texts.busySaved)).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
  });

  it('отказ сервера объясняется текстом и не закрывает окно', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => null });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    dialog({ onSaved });

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.busyFailure);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('на время отправки кнопка занята — второго нажатия не будет', async () => {
    let release: (() => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true, status: 201, json: async () => ({}) });
        }),
    );

    const user = userEvent.setup();
    dialog();

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('button', { name: texts.saving })).toBeDisabled();

    release?.();
    await waitFor(() => expect(screen.getByRole('button', { name: texts.save })).toBeEnabled());
  });

  it('оба варианта повтора названы человеческими словами', () => {
    dialog();

    for (const title of Object.values(REPEAT_TITLE)) {
      expect(screen.getByRole('option', { name: title })).toBeInTheDocument();
    }
  });
});
