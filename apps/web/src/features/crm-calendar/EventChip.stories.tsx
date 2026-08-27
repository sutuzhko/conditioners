import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EventChip } from './EventChip';
import {
  dayNote,
  doctorBlock,
  installers,
  lateInstall,
  monthEvents,
  monthLeads,
  monthOrders,
  plannedCall,
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

/** Первая запись выбранного вида — так истории не зависят от порядка фикстур. */
function pick(entity: ScheduleItem['entity'], patch: Partial<ScheduleSource> = {}): ScheduleItem {
  const column = dayColumns(source(patch), DAY)[0];
  const all = [...(column?.allDay ?? []), ...(column?.timed ?? []).map((placed) => placed.item)];
  const found = all.find((item) => item.entity === entity);
  if (found === undefined) throw new Error(`нет записи «${entity}»`);
  return found;
}

const meta = {
  title: 'Админка/Календарь/Запись',
  component: EventChip,
  parameters: { layout: 'padded' },
  args: { item: pick('event'), variant: 'bar' },
} satisfies Meta<typeof EventChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Дело: пунктирная полоса слева, номера нет — это напоминание, а не работа. */
export const Дело: Story = {};

/** 🔴 Наряд: сплошная полоса и номер — различие остаётся и в ч/б (ADR-093). */
export const Наряд: Story = {
  args: { item: pick('order') },
};

/** Заявка с сайта: живёт в полосе «весь день», пока ей не назначили время. */
export const Заявка: Story = {
  args: { item: pick('lead') },
};

/** Заметка «не забыть»: висит на дне, а не на часе. */
export const Заметка: Story = {
  args: { item: pick('event', { events: [dayNote], orders: [], leads: [] }) },
};

/** Отлучка: заштрихована — это не работа, а отсутствие человека. */
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

/** 🔴 Пересечение: рамка и слово — но запись остаётся на месте (ADR-115). */
export const Пересечение: Story = {
  args: { item: pick('order') },
};

/** 🔴 Переработка: минуты за рабочим окном помечены на самой записи (ADR-138). */
export const Переработка: Story = {
  args: { item: pick('event', { events: [lateInstall], orders: [], leads: [] }) },
};

/** Сделанное гаснет: видно, что осталось на сегодня. */
export const Выполненное: Story = {
  args: {
    item: pick('event', {
      events: [{ ...plannedCall, status: 'done' }],
      orders: [],
      leads: [],
    }),
  },
};

/** 🔴 Слой команды: краска человека перебивает краску вида работ (ADR-123). */
export const СлойКоманды: Story = {
  args: { item: pick('order', { team: installers }) },
};

/** Строка клетки месяца: та же запись, только в одну строку. */
export const СтрокаМесяца: Story = {
  args: { item: pick('order'), variant: 'row' },
};
