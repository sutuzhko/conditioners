import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { userEvent, within } from 'storybook/test';

import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { RouteModal } from './RouteModal';
import { useUnsavedInput } from './useUnsavedInput';

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

/**
 * Форма, которую правят только кнопкой: строки добавляют и убирают, ни одно
 * поле при этом не трогают. Живёт в истории, а не в ките — показывать нужно
 * поведение `useUnsavedInput`, а не заводить ради него компонент.
 */
function FormEditedByButtons() {
  const unsaved = useUnsavedInput();
  const [rows, setRows] = useState(1);

  return (
    <RouteModal title="Новая позиция" fallbackHref="/admin/stock" dirty={unsaved.dirty}>
      <div {...unsaved.scope}>
        <form>
          {Array.from({ length: rows }, (_, index) => (
            <Input key={index} label={`Строка ${index + 1}`} placeholder="Труба медная 1/4″" />
          ))}
          <Button variant="bordered" size="sm" onClick={() => setRows((count) => count + 1)}>
            Добавить строку
          </Button>
        </form>
      </div>
    </RouteModal>
  );
}

/**
 * 🔴 Правка кнопкой — тоже правка (issue #34). Строку добавили нажатием, ни
 * одного поля не тронули — и окно всё равно спрашивает, прежде чем закрыться.
 * До этого такое окно уходило молча вместе с добавленным.
 */
export const ПравкаКнопкой: Story = {
  render: () => <FormEditedByButtons />,
  play: async ({ canvasElement }) => {
    /* Окно монтируется порталом: ищем по документу, а не в корне истории. */
    const root = within(canvasElement.ownerDocument.body);
    await userEvent.click(await root.findByRole('button', { name: 'Добавить строку' }));
    await userEvent.click(await root.findByRole('button', { name: 'Закрыть' }));
  },
};
