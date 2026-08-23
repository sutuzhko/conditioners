import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DayPanel } from './DayPanel';
import { cancelledService, dayLead, doneMeasure, plannedCall, plannedInstall } from './fixtures';

const meta = {
  title: 'Админка/Календарь/День',
  component: DayPanel,
  args: {
    day: '2026-08-23',
    events: [plannedCall, plannedInstall],
    leads: [dayLead],
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
