import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { ProfileForm } from './ProfileForm';
import { profileFormContent as texts } from './content';
import { acceptingApi, failingApi, installerMe, neverLoggedInMe, ownerMe } from './fixtures';

const meta = {
  title: 'Админка/Профиль',
  component: ProfileForm,
  args: { me: ownerMe, api: acceptingApi },
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Владелец: Story = {};

export const Монтажник: Story = {
  args: { me: installerMe },
};

/** Учётная запись заведена, но человек ещё не заходил: даты нет и она не выдумывается. */
export const БезВходов: Story = {
  args: { me: neverLoggedInMe },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};

/** Повтор разошёлся с новым паролем: ошибка стоит у своего поля. */
export const ПаролиНеСовпадают: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(texts.passwordCurrent), 'старый-пароль');
    await userEvent.type(canvas.getByLabelText(texts.passwordNext), 'новый-пароль');
    await userEvent.type(canvas.getByLabelText(texts.passwordRepeat), 'новый-паролль');
    await userEvent.click(canvas.getByRole('button', { name: texts.passwordSubmit }));
  },
};

/** Подтверждение выхода на всех устройствах — диалог кита (ADR-113). */
export const ВыходВезде: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: texts.logoutAll }));
  },
};
