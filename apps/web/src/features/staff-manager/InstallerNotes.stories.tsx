import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { InstallerNotes } from './InstallerNotes';
import { acceptingApi, failingApi, notes } from './fixtures';

/**
 * Заметки владельца о монтажнике. Монтажник их не видит: раздел закрыт ролью
 * на сервере, а не скрытием блока (CRM §6).
 *
 * 🔴 Удаление спрашивает подтверждение окном кита (ADR-113, issue #603). В
 * витрине окно не открывается: у диалога свои истории, а здесь смотрят состав
 * карточки.
 */
const meta = {
  title: 'Админка/Заметки владельца',
  component: InstallerNotes,
  args: {
    staffId: 'u2',
    notes,
    api: acceptingApi,
    confirmRemove: async () => true,
  },
} satisfies Meta<typeof InstallerNotes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

export const Пусто: Story = {
  args: { notes: [] },
};

/** Длинная заметка: текст переносится, а действие остаётся на своём месте. */
export const ДлиннаяЗаметка: Story = {
  args: {
    notes: [
      {
        id: 'n9',
        text: 'Работает быстро, но за собой убирает не всегда: два раза клиент жаловался на мусор на лестничной клетке. Проверять фото «после» по каждому монтажу в жилом доме.',
        createdAt: '2026-08-21T10:00:00.000Z',
      },
    ],
  },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
