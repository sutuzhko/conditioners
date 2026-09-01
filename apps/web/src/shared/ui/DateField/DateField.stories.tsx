import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import type { FieldVariant } from '../internal/Field';
import { DateField, EMPTY_DATE, type DateSegments } from './DateField';

/** Поле управляемое: обёртка держит значение, как это делает форма наряда. */
function Controlled({
  initial = { day: '01', month: '09', year: '2026' },
  ...props
}: { initial?: DateSegments } & Omit<
  React.ComponentProps<typeof DateField>,
  'value' | 'onChange'
>) {
  const [value, setValue] = useState<DateSegments>(initial);
  return <DateField {...props} value={value} onChange={setValue} />;
}

const meta = {
  title: 'UI Kit/DateField',
  component: DateField,
  /* Обязательные пропсы объявлены здесь ради типов: сами истории рисуют
     управляемую обёртку, и до компонента эти значения не доходят. */
  args: { label: 'Дата выезда', value: EMPTY_DATE, onChange: () => {} },
  parameters: {
    layout: 'padded',
    // Допущение инвариантов — причина в reason (ADR-230)
    invariants: {
      allow: [{ rule: 'target-size', reason: 'issue #471 — сегменты даты 17×19 ниже минимума AA' }],
    },
  },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16, maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DateField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'Базовое состояние',
  render: (args) => <Controlled {...args} />,
};

export const Empty: Story = {
  name: 'Пусто',
  render: (args) => <Controlled {...args} initial={EMPTY_DATE} />,
};

export const Partial: Story = {
  name: 'Заполнено наполовину',
  render: (args) => <Controlled {...args} initial={{ day: '15', month: '', year: '' }} />,
};

export const Required: Story = {
  name: 'Обязательное',
  render: (args) => <Controlled {...args} required />,
};

export const WithHint: Story = {
  name: 'С подсказкой',
  render: (args) => <Controlled {...args} hint="Стрелки вверх и вниз меняют число" />,
};

export const WithError: Story = {
  name: 'Ошибка',
  render: (args) => (
    <Controlled
      {...args}
      initial={{ day: '31', month: '02', year: '2026' }}
      error="Такой даты не бывает"
    />
  ),
};

export const Disabled: Story = {
  name: 'Отключено',
  render: (args) => <Controlled {...args} disabled />,
};

const VARIANTS: readonly FieldVariant[] = ['flat', 'bordered', 'faded', 'underlined'];

/** Четыре вида оформления — те же, что у обычного поля: коробка общая. */
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

/** Период отчёта — два поля в ряд, ради чего сегменты и заведены. */
export const Period: Story = {
  name: 'Период',
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      <Controlled label="С" initial={{ day: '01', month: '08', year: '2026' }} />
      <Controlled label="По" initial={{ day: '31', month: '08', year: '2026' }} />
    </div>
  ),
};
