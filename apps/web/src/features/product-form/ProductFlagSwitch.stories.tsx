import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { productFormContent as texts } from './content';
import type { SetProductFlag } from './model';
import { ProductFlagSwitch } from './ProductFlagSwitch';

/* Тип объявлен явно: иначе умолчание в `meta` сужает шов до «всегда ok», и
   история отказа перестаёт собираться. */
const accepting: SetProductFlag = async () => ({ ok: true });
const refusing: SetProductFlag = async () => ({ ok: false, message: texts.serverError });

const meta = {
  title: 'Админка/Переключатель модели',
  component: ProductFlagSwitch,
  /* 🔴 История идёт внутри контейнера панели. Без `data-ui="panel"` высоты
     контролов и радиусы не объявлены вовсе (ADR-187): дорожка мерилась бы
     геометрией витрины, а живёт она в списке каталога — то есть в панели. */
  decorators: [
    (Story) => (
      <div data-ui="panel">
        <Story />
      </div>
    ),
  ],
  args: {
    id: '1',
    name: 'Сплит-система 09, инверторная',
    flag: 'visible',
    on: true,
    save: accepting,
  },
} satisfies Meta<typeof ProductFlagSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Модель снята с продажи: на сайте её нет ни в каталоге, ни по прямой ссылке. */
export const Снята: Story = {
  args: { on: false },
};

/** Витрина главной: тот же переключатель с другой подписью (issue #751). */
export const НаГлавной: Story = {
  args: { flag: 'featured' },
};

/** Модель продаётся, но на главную не вынесена. */
export const ТолькоВКаталоге: Story = {
  args: { flag: 'featured', on: false },
};

/** Сервер отказал: переключатель вернулся в прежнее положение и сказал об этом. */
export const Ошибка: Story = {
  args: { save: refusing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('switch'));
  },
};
