import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import type { CrmSearchHit } from '@/entities/crm/model';

import { CalendarSearch } from './CalendarSearch';
import { calendarSearchContent as texts } from './content';

const hits: CrmSearchHit[] = [
  {
    kind: 'order',
    id: 'o1',
    number: 1059,
    clientName: 'Пётр Соколов',
    address: 'Тула, Первомайская, 12',
    at: '2027-09-01T07:00:00.000Z',
  },
  {
    kind: 'event',
    id: 'e1',
    eventKind: 'measure',
    clientName: 'Ирина Соколова',
    address: null,
    at: '2026-08-20T09:00:00.000Z',
  },
];

const field = (): HTMLElement => screen.getByRole('combobox', { name: texts.label });

beforeEach(() => {
  push.mockClear();
});

describe('поиск по календарю', () => {
  it('находки показываются списком с датой и видом записи', async () => {
    render(<CalendarSearch team={false} find={async () => hits} />);

    await userEvent.type(field(), 'Соколов');

    expect(await screen.findByText(texts.order(1059))).toBeInTheDocument();
    expect(screen.getByText('Замер')).toBeInTheDocument();
    expect(screen.getByText('Тула, Первомайская, 12')).toBeInTheDocument();
    /* Дата по-русски и в поясе работ: московское утро 1 сентября, а не
       предыдущий день по Гринвичу. */
    expect(screen.getByText('1 сентября 2027')).toBeInTheDocument();
  });

  it('🔴 выбор находки ведёт в день записи и называет её адресом', async () => {
    render(<CalendarSearch team={false} find={async () => hits} />);

    await userEvent.type(field(), 'Соколов');
    await userEvent.click(await screen.findByRole('option', { name: /1059/ }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/admin/crm?view=day&day=2027-09-01&focus=o1'),
    );
  });

  it('находка выбирается и с клавиатуры', async () => {
    render(<CalendarSearch team={false} find={async () => hits} />);

    await userEvent.type(field(), 'Соколов');
    await screen.findByRole('option', { name: /1059/ });

    await userEvent.keyboard('{ArrowDown}{Enter}');

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/admin/crm?view=day&day=2026-08-20&focus=e1'),
    );
  });

  it('наложение занятости переезжает в найденный день вместе с переходом', async () => {
    render(<CalendarSearch team find={async () => hits} />);

    await userEvent.type(field(), 'Соколов');
    await userEvent.click(await screen.findByRole('option', { name: /1059/ }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/admin/crm?view=day&day=2027-09-01&focus=o1&team=on'),
    );
  });

  it('🔴 пустая выдача не разводит руками, а подсказывает, чем ещё искать', async () => {
    render(<CalendarSearch team={false} find={async () => []} />);

    await userEvent.type(field(), 'Несуществующий');

    expect(await screen.findByText(texts.empty)).toBeInTheDocument();
  });

  it('отказ сервера объясняется, а не глотается', async () => {
    render(
      <CalendarSearch
        team={false}
        find={async () => {
          throw new Error('связь потеряна');
        }}
      />,
    );

    await userEvent.type(field(), 'Соколов');

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.failed);
  });

  it('🔴 набор не бьёт по базе на каждой букве', async () => {
    const find = vi.fn().mockResolvedValue(hits);
    render(<CalendarSearch team={false} find={find} />);

    await userEvent.type(field(), 'Соколов');
    await screen.findByRole('option', { name: /1059/ });

    // семь нажатий — один запрос
    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith('Соколов');
  });

  it('очищенное поле закрывает список', async () => {
    render(<CalendarSearch team={false} find={async () => hits} />);

    await userEvent.type(field(), 'Соколов');
    await screen.findByRole('option', { name: /1059/ });

    await userEvent.clear(field());

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
});
