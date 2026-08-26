import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BlockDialog } from './BlockDialog';
import type { DayBlockDraft } from './model';

const draft: DayBlockDraft = {
  repeat: 'once',
  day: '2026-08-26',
  weekday: 3,
  allDay: true,
  from: '10:00',
  to: '12:00',
  reason: '',
};

const meta = {
  title: 'Админка/Календарь/Окно занятости',
  component: BlockDialog,
  parameters: { layout: 'fullscreen' },
  args: { open: true, onClose: () => {}, onSaved: () => {}, draft },
} satisfies Meta<typeof BlockDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Новая занятость на весь день — то, с чего начинают чаще всего. */
export const ВесьДень: Story = {};

/** Окно часов: поля времени появляются, когда «весь день» снят. */
export const Диапазон: Story = {
  args: { draft: { ...draft, allDay: false, from: '14:00', to: '16:00', reason: 'Врач' } },
};

/** Повторяемая: вместо даты — день недели. */
export const Повторяемая: Story = {
  args: { draft: { ...draft, repeat: 'weekly', weekday: 3, reason: 'Выходной' } },
};

/** Правка заведённой занятости: заголовок другой, поля заполнены. */
export const Правка: Story = {
  args: {
    id: 'b1',
    draft: { ...draft, allDay: false, from: '09:00', to: '10:30', reason: 'Школа' },
  },
};
