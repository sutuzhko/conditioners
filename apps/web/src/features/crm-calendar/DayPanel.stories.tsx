import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DayPanel } from './DayPanel';
import {
  cancelledService,
  clashingRepair,
  dayLead,
  doneMeasure,
  foreignBlock,
  monthBlocks,
  morningInstall,
  plannedCall,
  plannedInstall,
  viewerId,
  wholeDayBlock,
} from './fixtures';

const meta = {
  title: 'Админка/Календарь/День',
  component: DayPanel,
  args: {
    day: '2026-08-23',
    events: [plannedCall, plannedInstall],
    orders: [],
    leads: [dayLead],
    blocks: [],
    viewerId,
  },
} satisfies Meta<typeof DayPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Рабочий день: звонок и монтаж, плюс пришедшая заявка. */
export const Занятый: Story = {};

/** Ничего не запланировано и заявок не было. */
export const Пустой: Story = {
  args: { events: [], leads: [] },
};

/** Закрытые дела: сделанное гаснет, отменённое зачёркнуто. */
export const Закрытые: Story = {
  args: { events: [doneMeasure, cancelledService], leads: [] },
};

/** Только заявки: день, в который сами ничего не планировали. */
export const ТолькоЗаявки: Story = {
  args: { events: [], leads: [dayLead] },
};

/** День закрыт целиком: причина видна рядом, дела всё равно можно завести. */
export const ЗакрытыйДень: Story = {
  args: { day: '2026-08-26', events: [], leads: [], blocks: [wholeDayBlock] },
};

/** Занятость диапазоном: день с записью к врачу остаётся рабочим. */
export const ЗанятЧасами: Story = {
  args: { day: '2026-08-24', events: [], leads: [], blocks: monthBlocks },
};

/** Повторяемый выходной и разовая запись на один четверг. */
export const НесколькоЗаписей: Story = {
  args: { day: '2026-08-20', events: [], leads: [], blocks: monthBlocks },
};

/** Наряды этого дня: выезд с номером, статусом и переходом в свою карточку. */
export const СНарядами: Story = {
  args: { orders: [morningInstall, clashingRepair] },
};

/** Только наряды: день, в котором ничего, кроме выездов, не запланировано. */
export const ТолькоНаряды: Story = {
  args: { events: [], leads: [], orders: [morningInstall] },
};

/** Чужая занятость: владелец её видит, но снять не может — кнопок нет. */
export const ЧужаяЗанятость: Story = {
  args: { day: '2026-08-23', events: [], leads: [], blocks: [foreignBlock] },
};
