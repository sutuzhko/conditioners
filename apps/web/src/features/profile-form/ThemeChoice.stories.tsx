import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ThemeChoice } from './ThemeChoice';

const meta = {
  title: 'Админка/Выбор темы',
  component: ThemeChoice,
} satisfies Meta<typeof ThemeChoice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};
