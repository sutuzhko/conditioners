import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { MediaGone } from './MediaGone';

/**
 * Рамка на месте пропавшего файла (issue #690).
 *
 * 🔴 Две истории рядом показывают то, ради чего у рамки нет своих размеров:
 * в карточке отзыва она занимает место превью 220×165 и объясняет словами, в
 * плитке фотографий модели — квадрат 132px, где для пояснения места нет.
 * Один компонент, две геометрии, и обе задаёт раздел.
 */
const meta = {
  title: 'UI Kit/MediaGone',
  component: MediaGone,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaGone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {
  name: 'Превью со словами',
  args: {
    title: 'Фото недоступно',
    note: 'Файл снимка не найден — решайте по тексту отзыва',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 220, height: 165 }}>
        <div style={{ width: '100%', height: '100%' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

export const Плитка: Story = {
  name: 'Плитка без пояснения',
  args: { title: 'Файла нет' },
  decorators: [
    (Story) => (
      <div style={{ width: 132, height: 132 }}>
        <Story />
      </div>
    ),
  ],
};
