import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProfileExit } from './ProfileExit';

/* Типы объявлены явно: иначе умолчание в `meta` сужает шов, и история
   «выход идёт» перестаёт собираться. */
const done: () => Promise<void> = async () => undefined;
const hanging: () => Promise<void> = () => new Promise<void>(() => {});

const meta = {
  title: 'Админка/Выход из панели',
  component: ProfileExit,
  args: { logout: done },
} satisfies Meta<typeof ProfileExit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Запрос идёт: кнопка занята и повторного нажатия не принимает. */
export const Выходим: Story = {
  args: { logout: hanging },
};
