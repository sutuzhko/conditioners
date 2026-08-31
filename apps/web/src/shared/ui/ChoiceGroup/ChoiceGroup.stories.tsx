import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { CheckboxGroup } from './CheckboxGroup';
import { RadioGroup } from './RadioGroup';
import type { ChoiceOption } from './RadioGroup';

const PAYMENT: readonly ChoiceOption[] = [
  { value: 'cash', label: 'Наличными' },
  { value: 'card', label: 'Картой', description: 'Терминал у монтажника' },
  { value: 'invoice', label: 'По счёту', description: 'Для юридических лиц' },
];

const STATUSES: readonly ChoiceOption[] = [
  { value: 'new', label: 'Новые' },
  { value: 'work', label: 'В работе' },
  { value: 'done', label: 'Выполненные' },
  { value: 'fail', label: 'Отказы', disabled: true },
];

const meta = {
  title: 'UI Kit/RadioGroup',
  component: RadioGroup,
  args: { label: 'Способ оплаты', name: 'payment', options: PAYMENT, defaultValue: 'cash' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Empty: Story = { name: 'Ничего не выбрано', args: { defaultValue: undefined } };

export const Horizontal: Story = { name: 'В строку', args: { orientation: 'horizontal' } };

export const Required: Story = { name: 'Обязательная', args: { required: true } };

export const WithHint: Story = {
  name: 'С подсказкой',
  args: { hint: 'Способ оплаты попадёт в наряд монтажника' },
};

export const WithError: Story = {
  name: 'Ошибка',
  args: { defaultValue: undefined, error: 'Выберите способ оплаты' },
};

export const Disabled: Story = { name: 'Отключена', args: { disabled: true } };

export const DisabledOption: Story = {
  name: 'Отключённый вариант',
  args: {
    options: [...PAYMENT, { value: 'later', label: 'Потом', disabled: true }],
  },
};

/**
 * 🔴 Вся группа радио — одна остановка табуляции, а стрелки ходят по вариантам
 * с переносом по кругу. Это даёт нативный `input[type=radio]`, а не наш код.
 */
export const Keyboard: Story = {
  name: 'Фокус с клавиатуры',
  play: async ({ canvasElement }) => {
    const first = within(canvasElement).getByRole('radio', { name: /Наличными/ });
    await userEvent.tab();
    await expect(first).toHaveFocus();
  },
};

/* ——— Группа галочек живёт в этом же файле: у неё общий модуль стилей, и
   расхождение между ними должно быть видно на одном экране. ——— */

export const Checkboxes: Story = {
  name: 'Группа галочек',
  render: () => (
    <CheckboxGroup
      label="Показывать статусы"
      name="status"
      options={STATUSES}
      defaultValue={['new', 'work']}
      hint="Фильтр сохраняется до конца сессии"
    />
  ),
};

export const CheckboxesHorizontal: Story = {
  name: 'Галочки в строку',
  render: () => (
    <CheckboxGroup
      label="Показывать статусы"
      name="status"
      options={STATUSES}
      defaultValue={['new']}
      orientation="horizontal"
    />
  ),
};

export const CheckboxesError: Story = {
  name: 'Галочки — ошибка',
  render: () => (
    <CheckboxGroup
      label="Чеклист выезда"
      name="checklist"
      options={[
        { value: 'vacuum', label: 'Вакуумация выполнена' },
        { value: 'test', label: 'Пробный запуск' },
        { value: 'clean', label: 'Мусор вывезен' },
      ]}
      error="Отметьте все пункты — без этого наряд не закрыть"
    />
  ),
};

export const CheckboxesDisabled: Story = {
  name: 'Галочки отключены',
  render: () => (
    <CheckboxGroup label="Показывать статусы" name="status" options={STATUSES} disabled />
  ),
};
