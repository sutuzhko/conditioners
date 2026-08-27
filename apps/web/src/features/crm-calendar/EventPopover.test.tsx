import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { crmContent as texts } from './content';
import { EventPopover } from './EventPopover';
import { lateInstall, monthEvents, monthLeads, monthOrders, viewerId } from './fixtures';
import { dayColumns, type ScheduleItem, type ScheduleSource } from './schedule';

const DAY = '2026-08-23';

function pick(entity: ScheduleItem['entity'], patch: Partial<ScheduleSource> = {}): ScheduleItem {
  const column = dayColumns(
    {
      events: monthEvents,
      orders: monthOrders,
      leads: monthLeads,
      blocks: [],
      viewerId,
      today: DAY,
      ...patch,
    },
    DAY,
  )[0];

  const all = [...(column?.allDay ?? []), ...(column?.timed ?? []).map((placed) => placed.item)];
  const found = all.find((item) => item.entity === entity);
  if (found === undefined) throw new Error(`нет записи «${entity}»`);
  return found;
}

function card(item: ScheduleItem, handlers: Partial<Parameters<typeof EventPopover>[0]> = {}) {
  const onClose = handlers.onClose ?? vi.fn();

  render(
    <EventPopover
      item={item}
      anchor={new DOMRect(40, 40, 160, 60)}
      onClose={onClose}
      onEdit={handlers.onEdit ?? vi.fn()}
      onRemove={handlers.onRemove ?? vi.fn()}
      pending={handlers.pending}
    />,
  );

  return onClose;
}

describe('Карточка записи', () => {
  it('называет запись, время и место — то, за чем в неё открывают', () => {
    const event = pick('event');
    card(event);

    expect(screen.getByRole('dialog')).toHaveAccessibleName(`${texts.cardLabel}: ${event.title}`);
    expect(screen.getByText(event.title)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(event.range))).toBeInTheDocument();
  });

  it('телефон — ссылка: из карточки звонят, а не переписывают номер', () => {
    const event = pick('event');
    if (event.phone === null) throw new Error('у фикстуры нет телефона');

    card(event);

    expect(screen.getByRole('link', { name: event.phone })).toHaveAttribute(
      'href',
      `tel:${event.phone}`,
    );
  });

  it('🔴 переработка названа числом, а не флагом (ADR-138)', () => {
    card(pick('event', { events: [lateInstall], orders: [], leads: [] }));

    expect(screen.getByText(texts.overtimeOf('3 ч'))).toBeInTheDocument();
  });

  it('Escape закрывает: карточка ведёт себя как диалог', async () => {
    const user = userEvent.setup();
    const onClose = card(pick('event'));

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('нажатие мимо карточки закрывает её — как в эталоне', async () => {
    const user = userEvent.setup();
    const onClose = card(pick('event'));

    await user.click(document.body);

    expect(onClose).toHaveBeenCalled();
  });

  it('идёт запрос — кнопки заперты: второй раз удалить нечего', () => {
    card(pick('event'), { pending: true });

    expect(screen.getByRole('button', { name: texts.remove })).toBeDisabled();
  });

  it('фокус уходит в карточку: с клавиатуры она не пропускается', () => {
    card(pick('event'));

    expect(screen.getByRole('dialog')).toHaveFocus();
  });
});
