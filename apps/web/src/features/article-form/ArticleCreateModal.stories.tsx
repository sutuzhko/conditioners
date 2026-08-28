import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { ArticleCreateModal } from './ArticleCreateModal';
import { articleFormContent as texts } from './content';
import { acceptingSave, failingSave, rejectingSave } from './fixtures';

/**
 * Окно «Новая статья» (ADR-117).
 *
 * У окна свой адрес: в приложении его рисует перехватывающий маршрут, а прямой
 * заход по тому же адресу отдаёт страницу. В историях показано само окно —
 * маршрут задаёт раздел. Предпросмотр здесь сырой текст: настоящий разбор
 * живёт в домене, рисование — в виджете, и композирует их слой страниц.
 */
const meta = {
  title: 'Админка/База знаний · Окно создания',
  component: ArticleCreateModal,
  parameters: { layout: 'fullscreen' },
  args: {
    save: acceptingSave,
    renderPreview: (body: string) => (
      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{body}</pre>
    ),
  },
} satisfies Meta<typeof ArticleCreateModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Пустая форма: так окно открывается из списка. */
export const Пустое: Story = {};

/** Сервер назвал поле: ошибка встаёт у него, окно остаётся открытым. */
export const ОшибкаПоля: Story = {
  args: { save: rejectingSave },
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body;
    await userEvent.click(within(body).getByRole('button', { name: texts.create }));
  },
};

/** Сервер не принял: окно остаётся открытым и объясняет отказ. */
export const ОтказСервера: Story = {
  args: { save: failingSave },
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body;
    await userEvent.click(within(body).getByRole('button', { name: texts.create }));
  },
};
