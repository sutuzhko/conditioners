import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SpecsDictionaryForm } from './SpecsDictionaryForm';
import { acceptingSave, emptyDictionary, failingSave, filledDictionary } from './fixtures';

const meta = {
  title: 'Админка/Справочник характеристик',
  component: SpecsDictionaryForm,
  args: { value: filledDictionary, save: acceptingSave },
} satisfies Meta<typeof SpecsDictionaryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Заполнен: Story = {};

/** Пустой справочник — рабочее состояние: характеристики идут одним списком. */
export const Пустой: Story = {
  args: { value: emptyDictionary },
};

export const ОтказСервера: Story = {
  args: { save: failingSave },
};
