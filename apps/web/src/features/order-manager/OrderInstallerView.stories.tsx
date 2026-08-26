import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { OrderInstallerView } from './OrderInstallerView';
import { orderManagerContent as texts } from './content';
import {
  acceptingApi,
  failingApi,
  installerCompanyOrder,
  installerOrder,
  pendingApi,
} from './fixtures';

const meta = {
  title: 'Админка/Заказы/Наряд у монтажника',
  component: OrderInstallerView,
  args: { order: installerOrder, api: acceptingApi },
} satisfies Meta<typeof OrderInstallerView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 🔴 Оплата наличными: сумму заказа нужно принять от клиента. */
export const Базовое: Story = {};

/** Платит компания — суммы заказа монтажнику не приходит вовсе. */
export const ПлатитКомпания: Story = {
  args: { order: installerCompanyOrder },
};

/** Наряд без позиций: что везти, выяснится на замере. */
export const БезПозиций: Story = {
  args: { order: { ...installerOrder, units: [], comment: null, heightWorks: false } },
};

/** Работа уже идёт: статус выбран, дальше только «Выполнен». */
export const ВРаботе: Story = {
  args: { order: { ...installerOrder, status: 'in_progress' } },
};

/** Отмечает «В работе»: состояние видно без вмешательства. */
async function markInProgress(canvasElement: HTMLElement): Promise<void> {
  await userEvent.selectOptions(
    within(canvasElement).getByLabelText(texts.statusTitle),
    'in_progress',
  );
}

/** Сервер отказал в переходе: статус возвращается к прежнему. */
export const ОшибкаСервера: Story = {
  args: { api: failingApi },
  play: async ({ canvasElement }) => {
    await markInProgress(canvasElement);
  },
};

/** Запрос ушёл и не вернулся: поле статуса заблокировано. */
export const Отправка: Story = {
  args: { api: pendingApi },
  play: async ({ canvasElement }) => {
    await markInProgress(canvasElement);
  },
};

/** Длинные данные не должны рвать карточку на телефоне. */
export const ДлинныеДанные: Story = {
  args: {
    order: {
      ...installerOrder,
      address:
        'Тульская область, Ленинский район, посёлок Иншинский, дом 22, корпус 3, квартира 145',
      comment:
        'Домофон не работает, звонить на телефон за пятнадцать минут. Пятый этаж без лифта, узкая лестница — блок заносить вдвоём.',
    },
  },
};
