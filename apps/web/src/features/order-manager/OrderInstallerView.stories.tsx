import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderInstallerView } from './OrderInstallerView';
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

/** 🔴 Работа идёт: действие ведёт на сдачу, а не закрывает наряд отсюда. */
export const ВРаботе: Story = {
  args: { order: { ...installerOrder, status: 'in_progress' } },
};

/** Наряд сдан: вернуть его в работу может только владелец. */
export const Сдан: Story = {
  args: { order: { ...installerOrder, status: 'done' } },
};

/** Сервер отказал в переходе: причина названа словами. */
export const ОшибкаСервера: Story = {
  args: { api: failingApi },
};

/** Запрос ушёл и не вернулся: кнопка занята. */
export const Отправка: Story = {
  args: { api: pendingApi },
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
