import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { screen, userEvent } from 'storybook/test';

import { ProductCreateModal } from './ProductCreateModal';
import { productFormContent as texts } from './content';
import { acceptingSave, failingSave, pendingSave } from './fixtures';

/**
 * Окно заведения модели (ADR-117).
 *
 * У окна свой адрес — в приложении его рисует перехватывающий маршрут, а
 * прямой заход по тому же адресу отдаёт страницу. В историях показано само
 * окно: маршрут задаёт раздел.
 *
 * Окно живёт в портале, поэтому сценарии историй ищут его через `screen`,
 * а не внутри холста.
 */
const meta = {
  title: 'Админка/Каталог · Окно создания',
  component: ProductCreateModal,
  parameters: { layout: 'fullscreen' },
  args: { save: acceptingSave },
} satisfies Meta<typeof ProductCreateModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Пустая форма: фотографии и скидка появятся в карточке сохранённой модели. */
export const Базовое: Story = {};

/** Отправка: поля заблокированы, кнопка занята. */
export const Сохранение: Story = {
  args: { save: pendingSave },
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: texts.create }));
  },
};

/** Сервер не принял: окно остаётся открытым и объясняет отказ. */
export const ОтказСервера: Story = {
  args: { save: failingSave },
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: texts.create }));
  },
};

/**
 * 🔴 Введённое не теряется молча: Escape над заполненной формой заменяет
 * подвал окна вопросом, а не закрывает его (ADR-141).
 */
export const НесохранённыйВвод: Story = {
  play: async () => {
    await userEvent.type(await screen.findByLabelText(new RegExp(texts.name)), 'Сплит-система 09');
    await userEvent.keyboard('{Escape}');
  },
};
