import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { SettingsGroups } from './SettingsGroups';
import { settingsFormContent as texts } from './content';
import {
  acceptingSave,
  companyEntriesFixture,
  pendingSave,
  readyEntriesFixture,
  rejectingSave,
} from './fixtures';

const meta = {
  title: 'Админка/Данные компании',
  component: SettingsGroups,
  args: { entries: companyEntriesFixture, save: acceptingSave },
} satisfies Meta<typeof SettingsGroups>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Правит поле и нажимает одну кнопку: без правки она заблокирована. */
async function editAndSave(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText(/Почта/), 'x');
  await userEvent.click(canvas.getByRole('button', { name: texts.saveAll }));
}

/** Часть групп не заполнена: полоса готовности неполная, плашки разные. */
export const Базовое: Story = {};

/** Всё заполнено: сто процентов и ни одного предупреждения. */
export const ВсёЗаполнено: Story = {
  args: { entries: readyEntriesFixture },
};

/** Правка есть, но не сохранена: группа помечена, кнопка ожила. */
export const ЕстьПравки: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText(/Почта/), 'x');
  },
};

export const Сохраняем: Story = {
  args: { save: pendingSave },
  play: async ({ canvasElement }) => {
    await editAndSave(canvasElement);
  },
};

export const Сохранено: Story = {
  play: async ({ canvasElement }) => {
    await editAndSave(canvasElement);
  },
};

/** Сервер не принял группу: сводка называет её и ведёт к ней. */
export const ОтказСервера: Story = {
  args: { save: rejectingSave },
  play: async ({ canvasElement }) => {
    await editAndSave(canvasElement);
  },
};
