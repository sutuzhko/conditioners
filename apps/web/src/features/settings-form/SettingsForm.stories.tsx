import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { SettingsForm } from './SettingsForm';
import { settingsFormContent as texts } from './content';
import { SCHEDULE_GROUP } from './fields';
import {
  acceptingSave,
  achievementsGroupFixture,
  contactsGroupFixture,
  filledAchievements,
  fullAchievements,
  filledContacts,
  filledSchedule,
  integrationsGroupFixture,
  legalGroupFixture,
  pendingSave,
  rejectingSave,
} from './fixtures';

const meta = {
  title: 'Админка/Форма настроек',
  component: SettingsForm,
  args: { group: contactsGroupFixture, value: filledContacts, save: acceptingSave },
} satisfies Meta<typeof SettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Правит поле и нажимает «Сохранить»: без правки кнопка заблокирована. */
async function editAndSave(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText(/Почта/), 'x');
  await userEvent.click(canvas.getByRole('button', { name: texts.save }));
}

export const Базовое: Story = {};

/** Группа ещё не заполнена: так её видит владелец после установки. */
export const Пустая: Story = {
  args: { value: {} },
};

/** Есть несохранённые правки: появляется отмена, кнопка разблокирована. */
export const СПравками: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText(/Почта/), 'x');
  },
};

export const Сохранение: Story = {
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

export const ОшибкаПоля: Story = {
  args: { save: rejectingSave },
  play: async ({ canvasElement }) => {
    await editAndSave(canvasElement);
  },
};

/** Выбор из списка: форма собственности задаёт подпись ОГРН на сайте. */
export const СВыбором: Story = {
  args: { group: legalGroupFixture, value: { form: 'ИП', inn: '' } },
};

export const СФлажками: Story = {
  args: { group: integrationsGroupFixture, value: {} },
};

/** Цифры первого экрана: строка из числа, хвоста и подписи. */
export const СписокОбъектов: Story = {
  args: { group: achievementsGroupFixture, value: filledAchievements },
};

/** Предел из схемы: четыре цифры, кнопка добавления исчезла. */
export const СписокНаПределе: Story = {
  args: { group: achievementsGroupFixture, value: fullAchievements },
};

/**
 * Рабочее окно календаря. Группа взята настоящая: история показывает ровно тот
 * текст, которым владельцу объясняют разницу с «Часами работы» (ADR-128).
 */
export const РабочееОкно: Story = {
  args: { group: SCHEDULE_GROUP, value: filledSchedule },
};

/** Окно ещё не задавали: поля времени пусты, календарь живёт на умолчании. */
export const РабочееОкноПустое: Story = {
  args: { group: SCHEDULE_GROUP, value: {} },
};
