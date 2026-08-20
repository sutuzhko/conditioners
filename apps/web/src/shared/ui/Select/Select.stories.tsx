import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Select } from './Select';

const districts = [
  { value: 'centralnyy', label: 'Центральный' },
  { value: 'proletarskiy', label: 'Пролетарский' },
  { value: 'zarechenskiy', label: 'Зареченский' },
  { value: 'privokzalnyy', label: 'Привокзальный' },
];

const meta = {
  title: 'UI Kit/Select',
  component: Select,
  args: { label: 'Район', options: districts },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const WithPlaceholder: Story = {
  name: 'С плейсхолдером',
  args: { placeholder: 'Выберите район', defaultValue: '' },
};

export const WithHint: Story = {
  name: 'С подсказкой',
  args: { hint: 'Нужен для расчёта времени выезда' },
};

export const WithError: Story = {
  name: 'Ошибка',
  args: { error: 'Выберите район', placeholder: 'Выберите район', defaultValue: '' },
};

export const Disabled: Story = { name: 'Отключено', args: { disabled: true } };

export const DisabledOption: Story = {
  name: 'Недоступный пункт',
  args: {
    options: [
      ...districts,
      { value: 'oblast', label: 'Область — уточним по телефону', disabled: true },
    ],
  },
};

export const Empty: Story = {
  name: 'Пустой список',
  args: { options: [], placeholder: 'Районы не заданы', defaultValue: '' },
};

export const Choosing: Story = {
  name: 'Выбор с клавиатуры',
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByLabelText('Район');
    await userEvent.selectOptions(select, 'zarechenskiy');
    await expect(select).toHaveValue('zarechenskiy');
  },
};
