import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { visibleColumns } from './columns';
import { OrderTable } from './OrderTable';
import {
  cancelledOrder,
  declinedOrder,
  doneOrder,
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
  args: {
    items: [order, freshOrder, overtimeOrder, cancelledOrder],
    columns: visibleColumns('active'),
    now: NOW,
  },
} satisfies Meta<typeof OrderTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Вкладка «Активные»: номер, клиент и объект, монтажник, когда, статус, сумма. */
export const Базовое: Story = {};

/**
 * 🔴 Строка срыва: время выезда прошло, а работа не закончена. Просрочка видна
 * двумя признаками — краснотой даты и плашкой у статуса, — а не одним цветом.
 * Приглушённый текст на подсветке поднят до `--body`, у плашек снята заливка:
 * на двойном тинте пара давала 4,40:1 при норме 4,5 (issue #347).
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

/**
 * Вкладка «Новые»: свои колонки «Откуда» и «Создан», своё действие строки.
 * Пока не назначен монтажник, наряд не попадает ни в календарь, ни к нему.
 */
export const ВкладкаНовые: Story = {
  args: {
    items: [freshOrder],
    columns: visibleColumns('new'),
    rowAction: 'assign',
    selectable: true,
  },
};

/** Вкладка «История»: день закрытия вместо дня выезда. */
export const ВкладкаИстория: Story = {
  args: { items: [doneOrder], columns: visibleColumns('history') },
};

/**
 * Вкладка «Отказы»: колонки «Отказ» и «Причина» плюс возврат в работу.
 * Причина из справочника — строкой, дописанное словами — подписью под ней.
 */
export const ВкладкаОтказы: Story = {
  args: {
    items: [cancelledOrder, declinedOrder],
    columns: visibleColumns('cancelled'),
    rowAction: 'restore',
  },
};

/** Выбор строк включён: галочка первой колонкой, тап-зона до 900 — 44px. */
export const СВыбором: Story = {
  args: { selectable: true },
};
