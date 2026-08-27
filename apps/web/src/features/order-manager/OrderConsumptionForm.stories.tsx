import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { OrderConsumptionForm } from './OrderConsumptionForm';
import { orderManagerContent as texts } from './content';
import {
  acceptingConsume,
  failingConsume,
  installerZones,
  pendingConsume,
  stockHints,
  stockItems,
  stockZones,
} from './fixtures';

const meta = {
  title: 'Админка/Заказы/Списание материала',
  component: OrderConsumptionForm,
  args: {
    items: stockItems,
    zones: stockZones,
    hints: stockHints,
    onSubmit: acceptingConsume,
  },
} satisfies Meta<typeof OrderConsumptionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Владелец: зон две, поэтому источник выбирается. Сверху — подсказки чеклиста. */
export const Базовое: Story = {};

/**
 * 🔴 Глазами монтажника: зона одна — его машина. Списка нет, потому что
 * выбора нет: зон компании сервер ему не присылал (ADR-134).
 */
export const ГлазамиМонтажника: Story = {
  args: { zones: installerZones },
};

/** Чеклисту ничего не сопоставилось: форма работает и без подсказок. */
export const БезПодсказок: Story = {
  args: { hints: [] },
};

/** Справочник пуст: позиции заводит владелец в разделе склада. */
export const ПустойСправочник: Story = {
  args: { items: [] },
};

/** Техника ссылается на модель каталога — у неё спрашивают серийные номера. */
export const СерийныеНомера: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeZone), 'z2');
    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeItem), 's4');
  },
};

/**
 * 🔴 Минус на складе предупреждает, а не запрещает: кнопка рядом остаётся
 * рабочей. Запрет означал бы, что монтажник впишет неправду, лишь бы закрыть
 * наряд (CRM.md §11.6).
 */
export const МинусНаСкладе: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeZone), 'z2');
    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeItem), 's1');
    await userEvent.type(canvas.getByLabelText(texts.consumeQty), '30');
  },
};

/** Запрос не отвечает: кнопка занята, поля заблокированы. */
export const Отправка: Story = {
  args: { onSubmit: pendingConsume },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeZone), 'z2');
    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeItem), 's1');
    await userEvent.type(canvas.getByLabelText(texts.consumeQty), '4');
    await userEvent.click(canvas.getByRole('button', { name: texts.consumeSubmit }));
  },
};

/** Сервер назвал поле: подсветка встаёт у количества, а не общим сообщением. */
export const ОтказСервера: Story = {
  args: { onSubmit: failingConsume },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeZone), 'z2');
    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeItem), 's1');
    await userEvent.type(canvas.getByLabelText(texts.consumeQty), '4');
    await userEvent.click(canvas.getByRole('button', { name: texts.consumeSubmit }));
  },
};

/** Отправлено: строка ушла, форма готова к следующей — зона осталась выбранной. */
export const Успех: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeZone), 'z2');
    await userEvent.selectOptions(canvas.getByLabelText(texts.consumeItem), 's1');
    await userEvent.type(canvas.getByLabelText(texts.consumeQty), '4');
    await userEvent.click(canvas.getByRole('button', { name: texts.consumeSubmit }));
  },
};
