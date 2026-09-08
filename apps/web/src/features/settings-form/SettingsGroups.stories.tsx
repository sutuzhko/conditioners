import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
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

  /* 🔴 Витрина обязана повторить поля страницы. Липкая полоса выходит за них
     отрицательными полями, чтобы фон дошёл до края карточки; без обрамления
     она вылезала за корень истории, и документ становился шире окна на два
     гутера — инварианты ловили `scrollWidth 1448 > 1440` во всех шести
     историях. На самой странице этого не бывает: там полосу обнимает
     контейнер раздела. */
  decorators: [
    (Story: () => ReactElement) => (
      <div style={{ padding: '0 var(--gutter)' }}>
        <Story />
      </div>
    ),
  ],
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

/**
 * 🔴 Уход со страницы с несохранёнными правками (issue #32). Ссылка рядом с
 * формой изображает пункт бокового меню — в приложении вопрос встаёт ровно на
 * нём. Закрытие вкладки спрашивает так же по смыслу, но окном браузера: его
 * вида в витрине быть не может.
 */
export const УходСПравками: Story = {
  /* Поля даёт обрамление истории; здесь только ссылка рядом с формой.
     Размер цели задан прямо тут: в приложении его держит оболочка панели, а
     голая ссылка в витрине вышла бы ниже нормы 24×24 — и инварианты назвали
     бы дефектом историю, а не раздел. */
  decorators: [
    (Story: () => ReactElement) => (
      <>
        <a
          href="/admin/leads"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minInlineSize: 'var(--tap)',
            minBlockSize: 'var(--tap)',
          }}
        >
          Заявки
        </a>
        <Story />
      </>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(/Почта/), 'x');
    await userEvent.click(canvas.getByRole('link', { name: 'Заявки' }));
  },
};
