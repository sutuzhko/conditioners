import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AdminSummary } from './AdminSummary';
import {
  busyCounts,
  emptyCounts,
  quietCounts,
  readyReadiness,
  unfinishedReadiness,
  upcomingEvents,
} from './fixtures';

const meta = {
  title: 'Админка/Сводка',
  component: AdminSummary,
  args: { counts: quietCounts, readiness: readyReadiness },
} satisfies Meta<typeof AdminSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ВсёСпокойно: Story = {};

/** Заявки и отзывы ждут ответа — цифры выделены. */
export const ТребуетВнимания: Story = {
  args: { counts: busyCounts },
};

/** Первый заход после установки: данные компании ещё заглушки. */
export const ПустойСайт: Story = {
  args: { counts: emptyCounts, readiness: unfinishedReadiness },
};

/** Календарь не пуст: дела на ближайшие дни и одно просроченное. */
export const СДелами: Story = {
  args: { upcoming: upcomingEvents },
};
