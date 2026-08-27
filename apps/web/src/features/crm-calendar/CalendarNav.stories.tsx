import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CalendarNav } from './CalendarNav';

const meta = {
  title: 'Админка/Календарь/Шапка календаря',
  component: CalendarNav,
  args: {
    view: 'month',
    month: '2026-08',
    day: '2026-08-23',
    today: '2026-08-23',
    overdue: 0,
    team: false,
    canTeam: false,
  },
} satisfies Meta<typeof CalendarNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Месяц: листается месяцами, заголовок называет месяц и год. */
export const Месяц: Story = {};

/** Неделя: заголовок называет промежуток, листание идёт неделями. */
export const Неделя: Story = {
  args: { view: 'week' },
};

/** Неделя на стыке месяцев — оба месяца в заголовке. */
export const НеделяНаСтыке: Story = {
  args: { view: 'week', day: '2026-08-31' },
};

/** День: заголовок — дата, листание идёт днями. */
export const День: Story = {
  args: { view: 'day' },
};

/** Переключатель занятости команды — у владельца, выключен. */
export const СПереключателем: Story = {
  args: { view: 'week', canTeam: true },
};

/** 🔴 Наложение включено: занятость всей команды ляжет на ту же сетку. */
export const ЗанятостьВключена: Story = {
  args: { view: 'week', canTeam: true, team: true },
};

/** Просроченные дела: цифра рядом с заголовком, а не в глубине списка. */
export const СПросрочкой: Story = {
  args: { overdue: 3 },
};
