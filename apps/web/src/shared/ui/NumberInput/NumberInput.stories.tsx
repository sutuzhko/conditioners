import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import type { FieldVariant } from '../internal/Field';
import { NumberInput } from './NumberInput';

/** Поле управляемое: обёртка держит значение, как это делает форма расхода. */
function Controlled({
  initial = 4,
  ...props
}: { initial?: number | null } & Omit<
  React.ComponentProps<typeof NumberInput>,
  'value' | 'onValueChange'
>) {
  const [value, setValue] = useState<number | null>(initial);
  return <NumberInput {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: 'UI Kit/NumberInput',
  component: NumberInput,
  args: { label: 'Длина трассы', unit: 'м', min: 0, max: 30, step: 0.5 },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16, maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'Базовое состояние',
  render: (args) => <Controlled {...args} />,
};

export const Empty: Story = {
  name: 'Пусто',
  render: (args) => <Controlled {...args} initial={null} />,
};

export const AtMin: Story = {
  name: 'На нижней границе',
  render: (args) => <Controlled {...args} initial={0} />,
};

export const AtMax: Story = {
  name: 'На верхней границе',
  render: (args) => <Controlled {...args} initial={30} />,
};

export const WithoutUnit: Story = {
  name: 'Без единицы',
  render: (args) => <Controlled {...args} label="Количество" unit={undefined} step={1} />,
};

export const WithHint: Story = {
  name: 'С подсказкой',
  render: (args) => <Controlled {...args} hint="Считается от наружного блока до внутреннего" />,
};

export const WithError: Story = {
  name: 'Ошибка',
  render: (args) => <Controlled {...args} initial={0} error="Длина трассы не может быть нулевой" />,
};

export const Disabled: Story = {
  name: 'Отключено',
  render: (args) => <Controlled {...args} disabled />,
};

const VARIANTS: readonly FieldVariant[] = ['flat', 'bordered', 'faded', 'underlined'];

/** Четыре вида оформления — те же, что у обычного поля: шкура общая. */
export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {VARIANTS.map((variant) => (
        <Controlled {...args} key={variant} variant={variant} label={variant} />
      ))}
    </div>
  ),
};

/** Длинное число не уезжает под кнопки шага: правое поле держит место. */
export const LongValue: Story = {
  name: 'Длинное число',
  render: (args) => (
    <Controlled {...args} label="Расход хладагента" unit="г" initial={124500} max={999999} />
  ),
};
