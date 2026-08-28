import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { SettingsForm } from './SettingsForm';
import { settingsFormContent as texts } from './content';
import { SCHEDULE_GROUP } from './fields';
import {
  acceptingSave,
  achievementsGroupFixture,
  contactsGroupFixture,
  emptyEntrepreneur,
  filledAchievements,
  fullAchievements,
  filledCompany,
  filledContacts,
  filledEntrepreneur,
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

/**
 * Реквизиты предпринимателя: ФИО, ОГРНИП, дата и орган регистрации.
 *
 * Группа взята настоящая — история показывает ровно те подсказки, которыми
 * владельцу объясняют, что на сайт выводится, а что нет (ADR-112).
 */
export const РеквизитыПредпринимателя: Story = {
  args: { group: legalGroupFixture, value: filledEntrepreneur },
};

/** Реквизиты общества: сокращённое наименование, КПП, руководитель. */
export const РеквизитыОбщества: Story = {
  args: { group: legalGroupFixture, value: filledCompany },
};

/** Группа ещё не заполнена: менять форму не страшно, вопроса не будет. */
export const РеквизитыПустые: Story = {
  args: { group: legalGroupFixture, value: emptyEntrepreneur },
};

/**
 * Смена формы регистрации: окно называет исчезающее поимённо, отказ —
 * действие по умолчанию (ADR-112, ADR-113).
 */
export const СменаФормыРеквизитов: Story = {
  args: { group: legalGroupFixture, value: filledEntrepreneur },
  play: async ({ canvasElement }) => {
    await userEvent.selectOptions(within(canvasElement).getByLabelText(/Форма/), 'ООО');
  },
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
