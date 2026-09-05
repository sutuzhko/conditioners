import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CalendarActionsContext, type CalendarActions } from './actions';
import { crmContent as texts } from './content';
import { EventChip } from './EventChip';
import { dayNote, monthEvents, monthLeads, monthOrders, viewerId } from './fixtures';
import { dayColumns, type ScheduleItem } from './schedule';

const DAY = '2026-08-23';

function itemsOf(): readonly ScheduleItem[] {
  const column = dayColumns(
    {
      events: monthEvents,
      orders: monthOrders,
      leads: monthLeads,
      blocks: [],
      viewerId,
      today: DAY,
    },
    DAY,
  )[0];

  return [...(column?.allDay ?? []), ...(column?.timed ?? []).map((placed) => placed.item)];
}

function pick(entity: ScheduleItem['entity']): ScheduleItem {
  const found = itemsOf().find((item) => item.entity === entity);
  if (found === undefined) throw new Error(`нет записи «${entity}» в фикстурах`);
  return found;
}

function chip(item: ScheduleItem, actions: Partial<CalendarActions> = {}) {
  const value: CalendarActions = {
    create: vi.fn(),
    edit: vi.fn(),
    remove: vi.fn(),
    move: vi.fn(),
    block: vi.fn(),
    pending: null,
    ...actions,
  };

  render(
    <CalendarActionsContext.Provider value={value}>
      <EventChip item={item} />
    </CalendarActionsContext.Provider>,
  );

  return value;
}

describe('Запись календаря', () => {
  it('называет себя словами: цвет и полоса скринридеру ничего не говорят', () => {
    const event = pick('event');
    chip(event);

    expect(screen.getByRole('button', { name: event.label })).toBeInTheDocument();
  });

  it('🔴 открывается карточкой у самой записи, а не колонкой справа', async () => {
    const user = userEvent.setup();
    const event = pick('event');
    chip(event);

    const button = screen.getByRole('button', { name: event.label });

    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('открывается с клавиатуры: запись — обычная кнопка', async () => {
    const user = userEvent.setup();
    chip(pick('event'));

    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('«Изменить» отдаёт правку странице, а не правит запись сам', async () => {
    const user = userEvent.setup();
    const event = pick('event');
    const actions = chip(event);

    await user.click(screen.getByRole('button', { name: event.label }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: texts.edit }));

    expect(actions.edit).toHaveBeenCalledWith(event.edit);
  });

  it('«Удалить» спрашивает страницу — подтверждение живёт там (ADR-113)', async () => {
    const user = userEvent.setup();
    const event = pick('event');
    const actions = chip(event);

    await user.click(screen.getByRole('button', { name: event.label }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: texts.remove }),
    );

    expect(actions.remove).toHaveBeenCalledWith(event.edit);
  });

  it('🔴 наряд из карточки не правится — он живёт в своём разделе (ADR-093)', async () => {
    const user = userEvent.setup();
    const order = pick('order');
    chip(order);

    await user.click(screen.getByRole('button', { name: order.label }));

    const card = screen.getByRole('dialog');

    expect(within(card).queryByRole('button', { name: texts.edit })).toBeNull();
    expect(within(card).getByRole('link', { name: texts.orderOpen })).toBeInTheDocument();
  });

  it('заявка ведёт в свой раздел: календарь ею не управляет', async () => {
    const user = userEvent.setup();
    const lead = pick('lead');
    chip(lead);

    await user.click(screen.getByRole('button', { name: lead.label }));

    expect(
      within(screen.getByRole('dialog')).getByRole('link', { name: texts.leadLink }),
    ).toHaveAttribute('href', '/admin/leads');
  });

  it('заметка «не забыть» остаётся делом и правится из карточки', async () => {
    const user = userEvent.setup();
    const column = dayColumns(
      { events: [dayNote], orders: [], leads: [], blocks: [], viewerId, today: DAY },
      DAY,
    )[0];
    const note = column?.allDay[0];
    if (note === undefined) throw new Error('заметка не попала в полосу «весь день»');

    chip(note);
    await user.click(screen.getByRole('button', { name: note.label }));

    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: texts.edit }),
    ).toBeInTheDocument();
  });

  it('🔴 у записи «весь день» часа нет: у заявки в нём момент обращения', () => {
    const lead = pick('lead');
    chip(lead);

    /* Час заявки — когда человек написал, а не когда договорились. Показанный
       в полосе «Весь день», он читается как назначенное время (BUGS, аудит 30
       августа). В подписи он остаётся: там видно, что это за момент. */
    expect(screen.getByRole('button', { name: lead.label })).not.toHaveTextContent(lead.time);
  });

  it('запись на час свой час показывает', () => {
    const event = pick('event');
    chip(event);

    expect(screen.getByRole('button', { name: event.label })).toHaveTextContent(event.time);
  });

  it('🔴 обрезанное имя раскрывается подсказкой — и карточкой для клавиатуры', () => {
    const order = pick('order');
    chip(order);

    /* Подсказка при наведении не имеет права быть единственным путём к
       полному тексту: для клавиатуры и пальца тот же текст даёт карточка
       записи, открываемая нажатием (правило truncation-strategy). */
    expect(screen.getByTitle(order.title)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: order.label })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
  });
});
