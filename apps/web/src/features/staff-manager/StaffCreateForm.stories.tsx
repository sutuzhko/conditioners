import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StaffCreateForm } from './StaffCreateForm';
import { staffManagerContent as texts } from './content';
import { acceptingApi, failingApi, fieldRefusingApi } from './fixtures';
import type { StaffApi } from './model';

/**
 * Форма заведения монтажника.
 *
 * 🔴 Своя история, а не «то же самое, что в окне». Страницу `/admin/team/new`
 * рисует именно форма, а не окно: перехват работает только на переходе внутри
 * раздела, а прямой заход — ссылка из мессенджера, обновление, открытие в новой
 * вкладке — отдаёт страницу (ADR-117). Пока история была только у окна,
 * половина мест, где форму видит владелец, не показывалась нигде.
 */
const meta = {
  title: 'Админка/Форма нового монтажника',
  component: StaffCreateForm,
  args: { api: acceptingApi },
} satisfies Meta<typeof StaffCreateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Своя карточка с заголовком — так форма стоит в разделе и в окне. */
export const Пустая: Story = {};

/**
 * Без карточки: заголовок и рамку даёт страница `/admin/team/new`, форма
 * приносит только поля. Название при этом остаётся именем секции для читалки —
 * безымянной секции для неё не существует.
 */
export const БезКарточки: Story = {
  args: { surface: 'bare' },
};

/**
 * Выбрали самозанятость, ИНН не заполнили. Предупреждение встаёт сразу, а не
 * после сохранения, и сохранять не мешает: без номера статус на дату выплаты
 * проверить нечем, а слетевший статус означает доначисления владельцу
 * (PROJECT §5.4, ADR-144).
 */
export const СамозанятыйБезИНН: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText(texts.employment), 'self_employed');
  },
};

/** Сервер назвал поле — подсветка встаёт на логин, плашки под формой нет. */
export const ЗанятыйЛогин: Story = {
  args: { api: fieldRefusingApi },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(texts.login), 'sokolov');
    await userEvent.click(canvas.getByRole('button', { name: texts.add }));
  },
};

/** Отказ без названия поля: сообщение под формой, введённое остаётся на месте. */
export const ОтказСервера: Story = {
  args: { api: failingApi },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(texts.name), 'Сергей Иванов');
    await userEvent.click(canvas.getByRole('button', { name: texts.add }));
  },
};

/* Отправка, которая не завершается: состояние «занято» иначе живёт доли
   секунды, и увидеть заблокированные поля с подписью «Добавляем» нельзя. */
const hangingApi: StaffApi = {
  ...acceptingApi,
  create: () => new Promise(() => undefined),
};

/** Идёт отправка: кнопка занята, поля заблокированы. */
export const Отправка: Story = {
  args: { api: hangingApi },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(texts.name), 'Сергей Иванов');
    await userEvent.click(canvas.getByRole('button', { name: texts.add }));
  },
};

/** Удача: форма очищается, рядом с кнопкой встаёт подтверждение. */
export const Добавлен: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(texts.name), 'Сергей Иванов');
    await userEvent.click(canvas.getByRole('button', { name: texts.add }));
  },
};
