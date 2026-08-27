import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClashNote } from './ClashNote';

const meta = {
  title: 'Админка/Календарь/Предупреждение о пересечении',
  component: ClashNote,
  args: { items: ['10:00–13:00 · Наряд № 1059, Ирина Соколова'] },
} satisfies Meta<typeof ClashNote>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обычный случай: на это время у человека уже стоит выезд. */
export const ОдинВыезд: Story = {};

/** День расписан плотно — спорят сразу два наряда. */
export const ДваВыезда: Story = {
  args: {
    items: ['10:00–13:00 · Наряд № 1059, Ирина Соколова', '12:00–14:00 · Замер, Пётр Лапин'],
  },
};

/** Споров нет — предупреждения нет вовсе, а не пустая рамка. */
export const БезПересечений: Story = {
  args: { items: [] },
};
