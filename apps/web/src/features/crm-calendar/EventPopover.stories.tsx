import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EventPopover } from './EventPopover';
import {
  doctorBlock,
  installers,
  lateInstall,
  monthEvents,
  monthLeads,
  monthOrders,
  viewerId,
} from './fixtures';
import { dayColumns, type ScheduleItem, type ScheduleSource } from './schedule';

const DAY = '2026-08-23';

function source(patch: Partial<ScheduleSource> = {}): ScheduleSource {
  return {
    events: monthEvents,
    orders: monthOrders,
    leads: monthLeads,
    blocks: [],
    viewerId,
    today: DAY,
    ...patch,
  };
}

function pick(entity: ScheduleItem['entity'], patch: Partial<ScheduleSource> = {}): ScheduleItem {
  const column = dayColumns(source(patch), DAY)[0];
  const all = [...(column?.allDay ?? []), ...(column?.timed ?? []).map((placed) => placed.item)];
  const found = all.find((item) => item.entity === entity);
  if (found === undefined) throw new Error(`нет записи «${entity}»`);
  return found;
}

/** Карточка встаёт по прямоугольнику записи; в витрине он задаётся руками. */
const anchor = new DOMRect(40, 40, 160, 60);

const meta = {
  title: 'Админка/Календарь/Карточка записи',
  component: EventPopover,
  parameters: { layout: 'fullscreen' },
  args: {
    item: pick('event'),
    anchor,
    onClose: () => {},
    onEdit: () => {},
    onRemove: () => {},
  },
} satisfies Meta<typeof EventPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Дело: время, место, телефон и две кнопки — правка и удаление. */
export const Дело: Story = {};

/** 🔴 Наряд правится в своём разделе: из карточки — только переход (ADR-093). */
export const Наряд: Story = {
  args: { item: pick('order') },
};

/** Заявка: календарь показывает, что человек написал, но ею не управляет. */
export const Заявка: Story = {
  args: { item: pick('lead') },
};

/** Занятость: своя правится и снимается прямо отсюда (ADR-115). */
export const Занятость: Story = {
  args: {
    item: pick('block', {
      events: [],
      orders: [],
      leads: [],
      blocks: [{ ...doctorBlock, day: DAY }],
    }),
  },
};

/** 🔴 Переработка названа числом: «была переработка» не отвечает «сколько». */
export const Переработка: Story = {
  args: { item: pick('event', { events: [lateInstall], orders: [], leads: [] }) },
};

/** Слой команды: карточка называет человека, а не только красит запись. */
export const СлойКоманды: Story = {
  args: { item: pick('order', { team: installers }) },
};

/** Идёт запрос: кнопки заперты, пока сервер не ответил. */
export const Ожидание: Story = {
  args: { pending: true },
};
