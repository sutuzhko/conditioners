import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CopyField } from './CopyField';

const meta = {
  title: 'UI Kit/CopyField',
  component: CopyField,
  args: { label: 'Адрес статьи', value: '/knowledge/kak-vybrat-konditsioner-dlya-kvartiry' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16, maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CopyField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const WithoutLabel: Story = { name: 'Без подписи', args: { label: undefined } };

export const Login: Story = {
  name: 'Логин монтажника',
  args: { label: 'Логин', value: 'montazhnik-01' },
};

/** Пропорциональный набор: для человеческих строк моноширинный избыточен. */
export const Proportional: Story = {
  name: 'Обычный шрифт',
  args: { label: 'Название', value: 'Тульская климатическая компания', mono: false },
};

/**
 * Длинное значение обрезается многоточием, а не переносится: адрес статьи
 * бывает длиннее строки. Полное значение остаётся выделяемым мышью и
 * попадает в буфер целиком — обрезка чисто визуальная.
 */
export const LongValue: Story = {
  name: 'Длинное значение',
  args: {
    label: 'Адрес статьи',
    value:
      '/knowledge/shtroblenie-steny-ili-plastikovyy-korob-chem-pryatat-trassu-v-gotovom-remonte',
  },
};

/** Узкая колонка: строка ужимается, кнопка остаётся на месте. */
export const Narrow: Story = {
  name: 'В узкой колонке',
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16, maxWidth: 240 }}>
        <Story />
      </div>
    ),
  ],
};
