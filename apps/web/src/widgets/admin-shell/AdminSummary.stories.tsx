import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AdminSummary } from './AdminSummary';
import {
  attentionItems,
  busyCounts,
  busyDeltas,
  emptyCharts,
  emptyCounts,
  emptyDeltas,
  emptyMoney,
  emptyWork,
  filteredUpcoming,
  moneySummary,
  overdueItems,
  pagedUpcoming,
  quietCounts,
  quietDeltas,
  readyReadiness,
  summaryCharts,
  summaryHead,
  summaryPeriod,
  unfinishedReadiness,
  upcomingItems,
  upcomingOf,
  workCounts,
} from './fixtures';

const meta = {
  title: 'Админка/Сводка',
  component: AdminSummary,
  args: {
    period: summaryPeriod,
    head: summaryHead,
    data: {
      segment: 'overview',
      counts: quietCounts,
      deltas: quietDeltas,
      charts: summaryCharts,
      readiness: readyReadiness,
      upcoming: upcomingOf(upcomingItems),
    },
  },
} satisfies Meta<typeof AdminSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обычное утро: работа идёт, отвечать прямо сейчас никому не нужно. */
export const ВсёСпокойно: Story = {};

/**
 * Обращения ждут ответа, поток нарядов вырос: у трёх плиток из четырёх есть
 * чип изменения, и первый из них — тревога, а не направление (issue #590).
 */
export const ТребуетВнимания: Story = {
  args: {
    data: {
      segment: 'overview',
      counts: busyCounts,
      deltas: busyDeltas,
      charts: summaryCharts,
      readiness: readyReadiness,
      upcoming: upcomingOf(upcomingItems),
    },
  },
};

/** Первый заход после установки: ни клиентов, ни заказов, данные — заглушки. */
export const ПустойСайт: Story = {
  args: {
    data: {
      segment: 'overview',
      counts: emptyCounts,
      deltas: emptyDeltas,
      charts: emptyCharts,
      readiness: unfinishedReadiness,
      upcoming: upcomingOf([]),
    },
  },
};

/** До недели не дошли руки: просроченное мозолит глаза, а не исчезает. */
export const ЕстьПросроченное: Story = {
  args: {
    data: {
      segment: 'overview',
      counts: busyCounts,
      deltas: busyDeltas,
      charts: summaryCharts,
      readiness: readyReadiness,
      upcoming: upcomingOf(overdueItems),
    },
  },
};

/**
 * Отбор применён: условие видно плашкой и снимается одним нажатием, а пустой
 * результат объясняет, что снять (issue #591).
 */
export const ОтборПримен: Story = {
  name: 'Отбор применён',
  args: {
    data: {
      segment: 'overview',
      counts: busyCounts,
      deltas: busyDeltas,
      charts: summaryCharts,
      readiness: readyReadiness,
      upcoming: filteredUpcoming,
    },
  },
};

/** Дел больше страницы: под таблицей появляется разбивка с полосой номеров. */
export const НесколькоСтраниц: Story = {
  args: {
    data: {
      segment: 'overview',
      counts: busyCounts,
      deltas: busyDeltas,
      charts: summaryCharts,
      readiness: readyReadiness,
      upcoming: pagedUpcoming,
    },
  },
};

/** Сегмент «Работа»: успеваем ли. Ниже — наряды, по которым что-то не так. */
export const Работа: Story = {
  args: {
    head: summaryHead,
    data: { segment: 'work', work: workCounts, attention: attentionItems },
  },
};

/** Работа идёт по плану: список «требуют внимания» пуст, и это хорошая новость. */
export const РаботаБезСрывов: Story = {
  args: { head: summaryHead, data: { segment: 'work', work: emptyWork, attention: [] } },
};

/**
 * 🔴 Сегмент «Деньги»: выручка, средний чек, выплаты и структура. Ни
 * закупочных цен, ни себестоимости, ни маржи — их нет и в базе (CRM.md §11.7).
 */
export const Деньги: Story = {
  args: { head: summaryHead, data: { segment: 'money', money: moneySummary } },
};

/** Месяц только начался: закрытых нарядов нет, и график не рисуется вовсе. */
export const ДеньгиПусто: Story = {
  args: { head: summaryHead, data: { segment: 'money', money: emptyMoney } },
};
