import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Table } from '@/shared/ui';

import { ClientRow } from './ClientRow';
import { clientManagerContent as texts } from './content';
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
    /* 🔴 Строка живёт в той же таблице, что и на странице, — `Table` кита с
       `variant="cards"`, а не в голом `<table>`. Голая таблица не получает
       класса `.cards`, и ниже 600px строка остаётся строкой из семи колонок:
       история ехала вбок на сотню пикселей там, где раздел раскладывается
       карточками. Витрина обязана показывать то, что показывает страница. */
    (Story) => (
      <Table variant="cards" label={texts.tableLabel}>
        <thead>
          <tr>
            <th scope="col">{texts.colClient}</th>
            <th scope="col">{texts.colPhone}</th>
            <th scope="col">{texts.colAddress}</th>
            <th scope="col">{texts.colOrders}</th>
            <th scope="col">{texts.colSum}</th>
            <th scope="col">{texts.colLast}</th>
            <th scope="col">
              <span className="srOnly">{texts.colActions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <Story />
        </tbody>
      </Table>
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
