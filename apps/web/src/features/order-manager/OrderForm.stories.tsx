import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { OrderForm } from './OrderForm';
import { orderManagerContent as texts } from './content';
import {
  acceptingApi,
  clients,
  draft,
  failingApi,
  installers,
  order,
  pendingApi,
  staffDraft,
  unassignedDraft,
} from './fixtures';

const meta = {
  title: 'Админка/Заказы/Форма наряда',
  component: OrderForm,
  args: { api: acceptingApi, clients, installers, confirm: async () => true },
} satisfies Meta<typeof OrderForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Заведение: Story = {};

export const Правка: Story = {
  args: {
    orderId: order.id,
    orderNumber: order.number,
    initial: draft,
    title: texts.cardTitle,
    hint: texts.cardHint,
    removable: true,
  },
};

/** Самозанятый: удержание законно уменьшает вознаграждение. */
export const УдержаниеСамозанятому: Story = {
  args: { orderId: order.id, initial: { ...draft, deductionSum: '1500' } },
};

/**
 * 🔴 Трудовой договор: форма обязана сказать, что это внутренняя пометка и из
 * выплаты она не вычитается — штрафов как взыскания в ТК РФ нет.
 */
export const УдержаниеПоТрудовому: Story = {
  args: {
    orderId: order.id,
    initial: { ...staffDraft, deductionSum: '1500', deductionReason: 'Сорван выезд' },
  },
};

/** Монтажник не назначен — оформление неизвестно, ведём себя осторожно. */
export const БезМонтажника: Story = {
  args: { orderId: order.id, initial: unassignedDraft },
};

/** Нажимает «Сохранить» — состояние формы видно без вмешательства. */
async function save(canvasElement: HTMLElement): Promise<void> {
  await userEvent.click(within(canvasElement).getByRole('button', { name: texts.save }));
}

/** Сервер назвал поле: подсвечивается основание, а не общая ошибка внизу. */
export const ОшибкаСервера: Story = {
  args: {
    api: failingApi,
    orderId: order.id,
    initial: { ...draft, deductionSum: '1500', deductionReason: 'Брак' },
  },
  play: async ({ canvasElement }) => {
    await save(canvasElement);
  },
};

/** Запрос ушёл и не вернулся: кнопка и поля заблокированы. */
export const Отправка: Story = {
  args: { api: pendingApi, orderId: order.id, initial: draft },
  play: async ({ canvasElement }) => {
    await save(canvasElement);
  },
};

/** Сохранено: форма правки оставляет введённое на месте. */
export const Сохранено: Story = {
  args: { orderId: order.id, initial: draft },
  play: async ({ canvasElement }) => {
    await save(canvasElement);
  },
};

/** Базы ещё нет: клиента выбрать не из кого — наряд не заведёшь. */
export const БезКлиентов: Story = {
  args: { clients: [], installers: [] },
};
