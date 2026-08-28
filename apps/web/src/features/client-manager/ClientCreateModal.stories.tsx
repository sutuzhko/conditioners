import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientCreateModal } from './ClientCreateModal';
import { acceptingApi, failingApi } from './fixtures';

/**
 * Окно заведения клиента (ADR-117).
 *
 * Адрес у окна свой — в приложении его рисует перехватывающий маршрут, а
 * прямой заход по тому же адресу отдаёт страницу. В истории показано само
 * окно: маршрут задаёт раздел.
 */
const meta = {
  title: 'Админка/Новый клиент',
  component: ClientCreateModal,
  parameters: { layout: 'fullscreen' },
  args: { api: acceptingApi },
} satisfies Meta<typeof ClientCreateModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Пустая форма: телефон — ключ, по нему клиент опознаётся при обращении. */
export const Пустое: Story = {};

/** Сервер не принял: окно остаётся открытым и объясняет отказ. */
export const ОтказСервера: Story = {
  args: { api: failingApi },
};
