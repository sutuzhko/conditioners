import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { PhoneInput } from './PhoneInput';

/**
 * Поле телефона с маской. Значение управляемое, поэтому истории держат его в
 * состоянии — иначе поле не набирается и смотреть в нём нечего.
 */
const meta = {
  title: 'Кит/PhoneInput',
  component: PhoneInput,
  args: {
    label: 'Телефон',
    value: '',
    // истории держат значение сами: onChange подменяется в render
    onChange: () => undefined,
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <PhoneInput {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof PhoneInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { name: 'Пустое' };

export const Filled: Story = {
  name: 'Заполненное',
  args: { value: '+7 (912) 345-67-89' },
};

export const Incomplete: Story = {
  name: 'Номер недобран',
  args: { value: '+7 (912) 345' },
};

export const WithError: Story = {
  name: 'С ошибкой',
  args: { value: '+7 (912) 345', error: 'Похоже, в номере не хватает цифр' },
};

export const Disabled: Story = {
  name: 'Отключено',
  args: { value: '+7 (912) 345-67-89', disabled: true },
};
