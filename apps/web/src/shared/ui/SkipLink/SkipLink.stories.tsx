import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SkipLink } from './SkipLink';

const meta = {
  title: 'UI Kit/SkipLink',
  component: SkipLink,
  args: { href: '#top', children: 'К содержимому' },
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Рабочее состояние: ссылка в разметке, но спрятана за краем экрана. */
export const Basic: Story = { name: 'Спрятана до фокуса' };

/** Первый Tab на странице: ссылка выезжает поверх шапки обычной кнопкой. */
export const Focused: Story = {
  name: 'Видима на фокусе',
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('link')).toHaveFocus();
  },
};
