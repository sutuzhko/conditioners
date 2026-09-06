import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AllDayBar } from './AllDayBar';
import { dayNote, manyLeads, monthLeads, vacationBlock, viewerId, wholeDayBlock } from './fixtures';
import { dayColumns, weekColumns, type ScheduleColumn, type ScheduleSource } from './schedule';

const DAY = '2026-08-23';

function columnsOf(patch: Partial<ScheduleSource> = {}, day: string = DAY): ScheduleColumn[] {
  return [
    ...dayColumns(
      { events: [], orders: [], leads: [], blocks: [], viewerId, today: DAY, ...patch },
      day,
    ),
  ];
}

function weekOf(patch: Partial<ScheduleSource> = {}, day: string = DAY): ScheduleColumn[] {
  return [
    ...weekColumns(
      { events: [], orders: [], leads: [], blocks: [], viewerId, today: DAY, ...patch },
      day,
    ),
  ];
}

const meta = {
  title: 'Админка/Календарь/Полоса «весь день»',
  component: AllDayBar,
  parameters: { layout: 'padded' },
  args: { columns: columnsOf({ leads: monthLeads }) },
} satisfies Meta<typeof AllDayBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 🔴 Заявка с сайта живёт здесь, пока ей не назначили время (ADR-128). */
export const Заявка: Story = {};

/** Пустая полоса: она остаётся на месте — сетка не должна прыгать. */
export const Пусто: Story = {
  args: { columns: columnsOf() },
};

/** Заметка «не забыть» и закрытый целиком день — тоже про день, а не про час. */
export const ЗаметкаИЗанятость: Story = {
  args: { columns: columnsOf({ events: [dayNote], blocks: [{ ...wholeDayBlock, day: DAY }] }) },
};

/** 🔴 Переполнение: восемь заявок сворачиваются, а не съедают сетку часов. */
export const Переполнение: Story = {
  args: { columns: columnsOf({ leads: manyLeads }) },
};

/** Неделя: у каждой колонки свои записи, и ряд общий на все семь. */
export const Неделя: Story = {
  args: { columns: weekOf({ leads: monthLeads, events: [dayNote] }) },
};

/**
 * 🔴 Отпуск с 19 августа по 1 сентября — одна полоса через всю неделю, а не
 * семь одинаковых слов подряд (ADR-165). Неделя 24–30 августа лежит внутри
 * диапазона целиком, поэтому полоса обрезана с обеих сторон: она началась
 * раньше показанного и кончится позже.
 */
export const ОтпускЧерезВсюНеделю: Story = {
  args: { columns: weekOf({ blocks: [vacationBlock] }, '2026-08-26') },
};

/**
 * Начало отпуска: полоса начинается в среду 19 августа и уходит за правый
 * край недели — левый угол скруглён, правый обрезан.
 */
export const ОтпускНачинаетсяСредиНедели: Story = {
  args: { columns: weekOf({ blocks: [vacationBlock], leads: monthLeads }, '2026-08-19') },
};
