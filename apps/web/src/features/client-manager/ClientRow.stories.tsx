import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientRow } from './ClientRow';
import { acceptingApi, bareClient, client, failingApi } from './fixtures';

/**
 * Клиент строкой таблицы (issue #602, макет `Clients.png`): аватар-инициалы,
 * колонки «Заказов», «Сумма», «Последний» и действия строки.
 *
 * Окно подтверждения в витрине не открывается: у диалога свои истории (ADR-113).
 */
const meta = {
  title: 'Админка/Клиент в списке',
  component: ClientRow,
  args: { client, api: acceptingApi, confirmRemove: async () => true },
  decorators: [
    /* `<tr>` вне таблицы браузер выбрасывает из разметки: история показывала
       бы то, чего на экране не бывает. */
    (Story) => (
      <table style={{ inlineSize: '100%' }}>
        <tbody>
          <Story />
        </tbody>
      </table>
    ),
  ],
} satisfies Meta<typeof ClientRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/**
 * Заведён руками, по звонку: ни адреса, ни заметки, ни работ. Отсутствие
 * названо словами — «0 ₽» читалось бы как выручка, которой не случилось.
 */
export const БезРабот: Story = {
  args: { client: bareClient },
};

/** Длинная заметка и длинный адрес: строка остаётся строкой. */
export const ДлинныеПодписи: Story = {
  args: {
    client: {
      ...client,
      name: 'Константинопольская-Твердолобова Аполлинария Аристарховна',
      address: 'Новомосковск, микрорайон Урванский, Комсомольская 108, корпус 2, квартира 341',
      note: 'Домофон не работает, звонить на телефон. Пятый этаж без лифта, лестница узкая — блок заносить вдвоём.',
    },
  },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
