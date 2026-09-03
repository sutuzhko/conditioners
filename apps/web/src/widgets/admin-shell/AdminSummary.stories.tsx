import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AdminSummary } from './AdminSummary';
import {
  attentionItems,
  busyCounts,
  emptyCounts,
  emptyMoney,
  emptyWork,
  moneySummary,
  overdueItems,
  quietCounts,
  readyReadiness,
  summaryPeriod,
  unfinishedReadiness,
  upcomingItems,
  workCounts,
} from './fixtures';

const meta = {
  title: 'Админка/Сводка',
  component: AdminSummary,
  args: {
    period: summaryPeriod,
    data: {
      segment: 'overview',
      counts: quietCounts,
      readiness: readyReadiness,
      upcoming: upcomingItems,
    },
  },
} satisfies Meta<typeof AdminSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обычное утро: работа идёт, отвечать прямо сейчас никому не нужно. */
export const ВсёСпокойно: Story = {};

/** Обращения и отзывы ждут ответа — сегмент «Обзор» отвечает четырьмя числами. */
export const ТребуетВнимания: Story = {
  args: {
    data: {
      segment: 'overview',
      counts: busyCounts,
      readiness: readyReadiness,
      upcoming: upcomingItems,
    },
  },
};

/** Первый заход после установки: ни клиентов, ни заказов, данные — заглушки. */
export const ПустойСайт: Story = {
  args: {
    data: {
      segment: 'overview',
      counts: emptyCounts,
      readiness: unfinishedReadiness,
      upcoming: [],
    },
  },
};

/** До недели не дошли руки: просроченное мозолит глаза, а не исчезает. */
export const ЕстьПросроченное: Story = {
  args: {
    data: {
      segment: 'overview',
      counts: busyCounts,
      readiness: readyReadiness,
      upcoming: overdueItems,
    },
  },
};

/** Сегмент «Работа»: успеваем ли. Ниже — наряды, по которым что-то не так. */
export const Работа: Story = {
  args: { data: { segment: 'work', work: workCounts, attention: attentionItems } },
};

/** Работа идёт по плану: список «требуют внимания» пуст, и это хорошая новость. */
export const РаботаБезСрывов: Story = {
  args: { data: { segment: 'work', work: emptyWork, attention: [] } },
};

/**
 * 🔴 Сегмент «Деньги»: выручка, средний чек, выплаты и структура. Ни
 * закупочных цен, ни себестоимости, ни маржи — их нет и в базе (CRM.md §11.7).
 */
export const Деньги: Story = {
  args: { data: { segment: 'money', money: moneySummary } },
};

/** Месяц только начался: закрытых нарядов нет, и график не рисуется вовсе. */
export const ДеньгиПусто: Story = {
  args: { data: { segment: 'money', money: emptyMoney } },
};
