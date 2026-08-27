import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { OrderConsumption } from './OrderConsumption';
import { orderManagerContent as texts } from './content';
import {
  acceptingConsumptionApi,
  brokenConsumptionApi,
  emptyConsumptionApi,
  failingConsumptionApi,
  installerConsumptionApi,
  minusConsumptionApi,
  pendingConsumptionApi,
  stockChecklist,
  zonelessConsumptionApi,
} from './fixtures';

const meta = {
  title: 'Админка/Заказы/Расход материалов',
  component: OrderConsumption,
  args: {
    orderId: 'o1',
    checklist: stockChecklist,
    api: acceptingConsumptionApi,
    /* Подтверждение выведено пропом: история не открывает окно (ADR-113). */
    confirmReturn: async () => true,
  },
} satisfies Meta<typeof OrderConsumption>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Владелец: три списания, один возврат в журнале и выбор зоны в форме. */
export const Базовое: Story = {};

/** Ничего не списано: блок объясняет, зачем списание нужно, а не рисует пустую таблицу. */
export const Пусто: Story = {
  args: { api: emptyConsumptionApi },
};

/** Склад ещё отвечает: каркас вместо «Загрузка…». */
export const Загрузка: Story = {
  args: { api: pendingConsumptionApi },
};

/** Склад не ответил: блок предлагает повторить, а не показывает пустоту. */
export const ОшибкаЗагрузки: Story = {
  args: { api: brokenConsumptionApi },
};

/**
 * 🔴 Глазами монтажника: источник один — его машина, и выбора зоны нет.
 * Гаража в ответе не было вовсе, поэтому его нет и на экране (ADR-134).
 */
export const ГлазамиМонтажника: Story = {
  args: { api: installerConsumptionApi },
};

/**
 * 🔴 Минус на складе: списали больше, чем числилось. Предупреждение остаётся
 * и после списания — расхождение никуда не делось, нужна инвентаризация.
 */
export const МинусНаСкладе: Story = {
  args: { api: minusConsumptionApi },
};

/** Машину монтажнику ещё не завели: списывать неоткуда, и это сказано словами. */
export const БезЗонХранения: Story = {
  args: { api: zonelessConsumptionApi },
};

/** Сервер отказал в возврате: наряд закрыт, и отмена — решение владельца. */
export const ОтказВВозврате: Story = {
  args: { api: failingConsumptionApi },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await canvas.findByRole('button', {
      name: texts.consumptionReturnLabel('Труба медная 1/4″'),
    });

    await userEvent.click(button);
  },
};
