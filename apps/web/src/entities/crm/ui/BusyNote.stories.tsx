import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BusyNote } from './BusyNote';

const meta = {
  title: 'Админка/Календарь/Предупреждение о занятости',
  component: BusyNote,
  args: { busy: { state: 'full', reasons: ['Семейные дела'] } },
} satisfies Meta<typeof BusyNote>;

export default meta;
type Story = StoryObj<typeof meta>;

/** День закрыт целиком с причиной — самый частый случай. */
export const ВесьДень: Story = {};

/** Причину не указали: день всё равно закрыт, и это надо сказать. */
export const БезПричины: Story = {
  args: { busy: { state: 'full', reasons: [] } },
};

/** Запись к врачу на два часа: день остаётся рабочим. */
export const Диапазон: Story = {
  args: {
    busy: { state: 'partial', windows: [{ fromMin: 840, toMin: 960, reasons: ['Врач'] }] },
  },
};

/** Два окна в одном дне — утреннее и вечернее. */
export const ДваОкна: Story = {
  args: {
    busy: {
      state: 'partial',
      windows: [
        { fromMin: 540, toMin: 600, reasons: ['Школа'] },
        { fromMin: 1080, toMin: 1140, reasons: ['Врач'] },
      ],
    },
  },
};

/** Владелец смотрит чужую занятость: без имени она ему ничего не скажет. */
export const ЧужаяЗанятость: Story = {
  args: { busy: { state: 'full', reasons: ['Отпуск'] }, who: 'Дмитрий' },
};

/** Свободный день: предупреждения нет вовсе, а не пустая рамка. */
export const Свободно: Story = {
  args: { busy: { state: 'free' } },
};
