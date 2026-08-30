import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button, type ButtonSize, type ButtonVariant } from './Button';

const VARIANTS: readonly ButtonVariant[] = [
  'solid',
  'flat',
  'bordered',
  'faded',
  'light',
  'ghost',
  'danger',
];

const SIZES: readonly ButtonSize[] = ['sm', 'md', 'lg'];

const meta = {
  title: 'UI Kit/Button',
  component: Button,
  args: { children: 'Рассчитать стоимость' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    size: { control: 'inline-radio', options: SIZES },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' } as const;
const column = { display: 'flex', flexDirection: 'column', gap: 16 } as const;

export const Basic: Story = { name: 'Базовое состояние' };

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={row}>
      {VARIANTS.map((variant) => (
        <Button {...args} key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

/**
 * Семь заливок на трёх размерах. Матрица нужна целиком: расхождение размеров
 * между вариантами видно только в ряду — по одной кнопке за раз оно не ловится.
 */
export const Matrix: Story = {
  name: 'Варианты и размеры',
  render: (args) => (
    <div style={column}>
      {SIZES.map((size) => (
        <div key={size} style={row}>
          {VARIANTS.map((variant) => (
            <Button {...args} key={variant} variant={variant} size={size}>
              {`${variant} · ${size}`}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <div style={row}>
      {SIZES.map((size) => (
        <Button {...args} key={size} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
};

/**
 * Состояния, которые видны в статике: покой, отказ, отказ с причиной, занято.
 * Наведение, нажатие и фокус существуют только в живом браузере — им отданы
 * истории «Наведение» и «Фокус» с `play`, а нажатие проверяется просмотром
 * через Playwright MCP.
 */
export const States: Story = {
  name: 'Состояния',
  render: (args) => (
    <div style={column}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={row}>
          <Button {...args} variant={variant}>
            Покой
          </Button>
          <Button {...args} variant={variant} disabled>
            Отключена
          </Button>
          <Button
            {...args}
            variant={variant}
            disabled
            disabledReason="Сначала заполните обязательные поля"
          >
            Отказ с причиной
          </Button>
          <Button {...args} variant={variant} loading>
            Отправляем
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const Hover: Story = {
  name: 'Наведение',
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.hover(button);
    await expect(button).toBeEnabled();
  },
};

/** Кольцо фокуса — двухслойное `--ring-focus-ring`: отбивка фоном, затем контур. */
export const Focus: Story = {
  name: 'Фокус',
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.tab();
    await expect(button).toHaveFocus();
  },
};

export const Disabled: Story = { name: 'Отключена', args: { disabled: true } };

/**
 * Отказ, который объясняет себя. Кнопка остаётся в обходе с клавиатуры —
 * иначе причина недостижима для того, кто не видит экрана.
 */
export const DisabledWithReason: Story = {
  name: 'Отключена с причиной',
  args: {
    disabled: true,
    disabledReason: 'Нельзя удалить последнего администратора',
    children: 'Удалить',
    variant: 'danger',
  },
};

export const Loading: Story = { name: 'Загрузка', args: { loading: true } };

export const WithIcon: Story = {
  name: 'С иконкой',
  args: {
    iconStart: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
};

export const FullWidth: Story = {
  name: 'Во всю ширину',
  args: { fullWidth: true },
};

export const EmptyLabel: Story = {
  name: 'Пустая подпись',
  args: { children: '' },
};

/** Кнопка «Заказать» в карточке каталога: заливка --accent-bg, текст --on-accent. */
export const Flat: Story = {
  name: 'Акцентная',
  args: { variant: 'flat', children: 'Заказать' },
};

/**
 * Те же кнопки внутри панели управления: `data-ui="panel"` включает её
 * плотность и геометрию (ADR-187) — пилюля и высоты 32 / 40 / 48 вместо
 * 40 / 44 / 52 витрины. Разметка при этом та же самая.
 */
export const InPanel: Story = {
  name: 'В панели',
  render: (args) => (
    <div data-ui="panel" style={column}>
      {SIZES.map((size) => (
        <div key={size} style={row}>
          {VARIANTS.map((variant) => (
            <Button {...args} key={variant} variant={variant} size={size}>
              {`${variant} · ${size}`}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
