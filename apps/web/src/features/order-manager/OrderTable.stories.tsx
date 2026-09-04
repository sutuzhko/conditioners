import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderTable } from './OrderTable';
import {
  cancelledOrder,
  freshOrder,
  installerOrder,
  installerOvertimeOrder,
  longOrder,
  order,
  overtimeOrder,
} from './fixtures';

/**
 * Момент отсчёта просрочки в историях задан числом, а не берётся из часов:
 * иначе кадр менялся бы каждый день, а с ним и снимок.
 */
const NOW = '2026-08-27T09:00:00.000Z';

const meta = {
  title: 'Админка/Заказы/Таблица нарядов',
  component: OrderTable,
  args: { items: [order, freshOrder, overtimeOrder, cancelledOrder], now: NOW },
} satisfies Meta<typeof OrderTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Шесть колонок: когда, работа и объект, монтажник, статус, сумма, действия. */
export const Базовое: Story = {};

/**
 * 🔴 Строка срыва: время выезда прошло, а работа не закончена. Приглушённый
 * текст на ней поднят до `--body`, у плашек снята заливка — на двойном тинте
 * пара давала 4,40:1 при норме 4,5 (issue #347).
 */
export const СтрокаСрыва: Story = {
  args: { now: '2026-08-30T09:00:00.000Z' },
};

/** 🔴 Глазами монтажника: колонки суммы нет вовсе, а не прочерк в ней. */
export const ГлазамиМонтажника: Story = {
  args: { items: [installerOrder, installerOvertimeOrder], forInstaller: true },
};

/** Длинные данные: адрес и имя не должны рвать ни строку, ни карточку. */
export const ДлинныеДанные: Story = {
  args: { items: [longOrder, order] },
};

/** Одна строка: у таблицы из одной работы шапка остаётся на месте. */
export const ОднаСтрока: Story = {
  args: { items: [freshOrder] },
};
