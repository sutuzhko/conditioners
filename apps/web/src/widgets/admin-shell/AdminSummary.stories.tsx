import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AdminSummary } from './AdminSummary';
import {
  busyCounts,
  emptyCounts,
  overdueItems,
  quietCounts,
  readyReadiness,
  unfinishedReadiness,
  upcomingItems,
} from './fixtures';

const meta = {
  title: 'Админка/Сводка',
  component: AdminSummary,
  args: { counts: quietCounts, readiness: readyReadiness },
} satisfies Meta<typeof AdminSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обычное утро: работа идёт, отвечать прямо сейчас никому не нужно. */
export const ВсёСпокойно: Story = {};

/** Обращения и отзывы ждут ответа — цифры выделены. */
export const ТребуетВнимания: Story = {
  args: { counts: busyCounts },
};

/** Первый заход после установки: ни клиентов, ни заказов, данные — заглушки. */
export const ПустойСайт: Story = {
  args: { counts: emptyCounts, readiness: unfinishedReadiness },
};

/** Всё заполнено: готовность уходит вниз тихой строкой и не отодвигает работу. */
export const ВсёЗаполнено: Story = {
  args: { counts: busyCounts, upcoming: upcomingItems },
};

/** Наряды и дела вперемешку по времени — и различимы между собой. */
export const СДелами: Story = {
  args: { upcoming: upcomingItems },
};

/** До недели не дошли руки: просроченное мозолит глаза, а не исчезает. */
export const ЕстьПросроченное: Story = {
  args: { upcoming: overdueItems },
};
