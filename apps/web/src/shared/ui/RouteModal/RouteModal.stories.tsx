import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { RouteModal } from './RouteModal';

/**
 * Окно с собственным адресом: им открывается создание в панели (ADR-117).
 * В истории оно ведёт себя как страница — «назад» закрывает, ссылку можно
 * прислать. Здесь показано только содержимое: маршрут задаёт раздел.
 */
const meta = {
  title: 'UI Kit/RouteModal',
  component: RouteModal,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Новая позиция',
    fallbackHref: '/admin/stock',
    children: null,
  },
} satisfies Meta<typeof RouteModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {
  args: {
    children: (
      <form>
        <Input label="Название" name="name" placeholder="Труба медная 1/4″" />
      </form>
    ),
  },
};

/** С пояснением и кнопками: обычный вид формы создания. */
export const СФормой: Story = {
  args: {
    description: 'Позиция появится в справочнике. Остаток заводится приходом.',
    children: (
      <form>
        <Input label="Название" name="name" placeholder="Труба медная 1/4″" />
        <Input label="Группа" name="group" placeholder="Медная труба" />
      </form>
    ),
    footer: (
      <>
        <Button variant="light">Отмена</Button>
        <Button>Завести</Button>
      </>
    ),
  },
};
