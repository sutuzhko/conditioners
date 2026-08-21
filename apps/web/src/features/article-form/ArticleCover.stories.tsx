import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ArticleCover, type CoverUpload } from './ArticleCover';

/* Тип объявлен явно: иначе `satisfies` выведет из общих аргументов
   `{ ok: true }` и история с отказом перестанет ему соответствовать. */
const acceptingUpload: CoverUpload = async () => ({ ok: true });

const failingUpload: CoverUpload = async () => ({
  ok: false,
  message: 'Фото больше 5 МБ. Уменьшите снимок',
});

const meta = {
  title: 'Админка/Обложка статьи',
  component: ArticleCover,
  args: { cover: null, upload: acceptingUpload },
} satisfies Meta<typeof ArticleCover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обложки нет — в списке статья покажется без картинки. */
export const БезОбложки: Story = {};

export const СОбложкой: Story = {
  args: { cover: '/media/demo-cover.jpg' },
};

export const ОтказСервера: Story = {
  args: { upload: failingUpload },
};
