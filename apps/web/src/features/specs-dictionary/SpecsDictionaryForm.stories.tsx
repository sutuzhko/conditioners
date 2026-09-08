import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { SpecsDictionaryForm } from './SpecsDictionaryForm';
import { specsDictionaryContent as texts } from './content';
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

/**
 * 🔴 Удаление группы спрашивает и называет, сколько характеристик исчезнет
 * вместе с ней (issue #35): «удалить группу» не говорит, сколько работы
 * потеряется. Окно — диалог кита, а не браузера (ADR-113).
 */
export const УдалениеГруппы: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: texts.groupRemove(1) }));
  },
};
