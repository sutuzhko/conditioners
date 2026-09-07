import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { acceptingApi, cancelledOrder, doneOrder, failingApi, order, pendingApi } from './fixtures';
import { OrderOwnerActions } from './OrderOwnerActions';

const meta = {
  title: 'Админка/Заказы/Действия над нарядом',
  component: OrderOwnerActions,
  args: { order, api: acceptingApi },
} satisfies Meta<typeof OrderOwnerActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Назначенный наряд: следующий шаг очевиден — закрыть выезд. */
export const Базовое: Story = {};

/** Работа идёт: то же действие, другой чип состояния. */
export const ВРаботе: Story = {
  args: { order: { ...order, status: 'in_progress' } },
};

/**
 * 🔴 У выполненного наряда кнопки закрытия нет: закрывать нечего, а «отметить
 * выполненным» повторно ничего не значит.
 */
export const Выполнен: Story = {
  args: { order: doneOrder },
};

/**
 * 🔴 Отказ не «выполняют» задним числом: наряд возвращают в работу отдельным
 * действием, иначе отказ молча превращается в выручку.
 */
export const Отказ: Story = {
  args: { order: cancelledOrder },
};

/** Сервер отказал в переходе: причина названа словами и звучит для читалки. */
export const ОшибкаСервера: Story = {
  args: { api: failingApi },
};

/** Запрос ушёл и не вернулся: кнопка занята. */
export const Отправка: Story = {
  args: { api: pendingApi },
};

/** Длинный адрес переносится, а действия остаются в строке. */
export const ДлинныйАдрес: Story = {
  args: {
    order: {
      ...order,
      address:
        'Тульская область, Ленинский район, посёлок Иншинский, дом 22, корпус 3, квартира 145',
    },
  },
};
