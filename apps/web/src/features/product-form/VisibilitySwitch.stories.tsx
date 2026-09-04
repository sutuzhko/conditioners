import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { productFormContent as texts } from './content';
import type { SetVisible } from './model';
import { VisibilitySwitch } from './VisibilitySwitch';

/* Тип объявлен явно: иначе умолчание в `meta` сужает шов до «всегда ok», и
   история отказа перестаёт собираться. */
const accepting: SetVisible = async () => ({ ok: true });
const refusing: SetVisible = async () => ({ ok: false, message: texts.serverError });

const meta = {
  title: 'Админка/Видимость модели',
  component: VisibilitySwitch,
  args: {
    id: '1',
    name: 'Сплит-система 09, инверторная',
    visible: true,
    save: accepting,
  },
} satisfies Meta<typeof VisibilitySwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Модель снята с продажи: на сайте её нет ни в каталоге, ни по прямой ссылке. */
export const Снята: Story = {
  args: { visible: false },
};

/** Сервер отказал: переключатель вернулся в прежнее положение и сказал об этом. */
export const Ошибка: Story = {
  args: { save: refusing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('switch'));
  },
};
