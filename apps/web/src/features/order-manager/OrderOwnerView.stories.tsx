import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { acceptingWorkApi, cancelledOrder, doneOrder, freshOrder, order } from './fixtures';
import { OrderOwnerView } from './OrderOwnerView';
import { OrderResultForm } from './OrderResultForm';

/** Итог работ — та же форма, что на живой странице: карточка её только держит. */
const result = (
  <OrderResultForm api={acceptingWorkApi} extraWork={null} report={null} resultAt={null} />
);

const meta = {
  title: 'Админка/Заказы/Наряд у владельца',
  component: OrderOwnerView,
  args: { order, result },
} satisfies Meta<typeof OrderOwnerView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Назначенный наряд: объект, оборудование, деньги, исполнитель. */
export const Базовое: Story = {};

/**
 * Только заведён: ни монтажника, ни позиций, ни заметки. 🔴 Пустые места
 * названы словами, а не оставлены пробелом: «Не назначен» отвечает на вопрос,
 * пустая строка — нет.
 */
export const ТолькоЗаведён: Story = {
  args: { order: freshOrder },
};

/**
 * 🔴 Отказ показывается только у отменённого наряда: причина без отказа
 * читается как действующая (ADR-310). Макет этого блока не рисует — он рисует
 * наряд в работе, — но данные у наряда есть.
 */
export const Отказ: Story = {
  args: { order: cancelledOrder },
};

/** Выполненный наряд: итог заполнен, и карточка показывает его дату. */
export const Выполнен: Story = {
  args: {
    order: doneOrder,
    result: (
      <OrderResultForm
        api={acceptingWorkApi}
        extraWork={'Два метра трассы сверх наряда, кронштейн усиленный'}
        report={'Блок повешен, вакуумирование 20 минут, клиенту показан режим обслуживания.'}
        resultAt={'2026-08-24T15:40:00.000Z'}
      />
    ),
  },
};

/** Удержание с основанием: сумма без причины через полгода не значит ничего. */
export const СУдержанием: Story = {
  args: {
    order: { ...order, deductionSum: 1_500, deductionReason: 'Сорван выезд без предупреждения' },
  },
};

/** 🔴 Переработка названа фактом, а не доплатой (ADR-138). */
export const СПереработкой: Story = {
  args: { order: { ...order, overtimeMin: 95 } },
};

/** Длинные данные не должны рвать колонки: адрес, комментарий и заметка. */
export const ДлинныеДанные: Story = {
  args: {
    order: {
      ...order,
      address:
        'Тульская область, Ленинский район, посёлок Иншинский, дом 22, корпус 3, квартира 145',
      comment:
        'Домофон не работает, звонить на телефон за пятнадцать минут. Пятый этаж без лифта, узкая лестница — блок заносить вдвоём. На объекте собака, просят предупредить за час.',
      ownerNote:
        'Клиент постоянный, второй кондиционер за год. Скидку не даём, но монтаж считаем по нижней границе — он приводит соседей.',
    },
  },
};
