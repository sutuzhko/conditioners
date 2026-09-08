import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ADMIN_PERMISSION_TITLES } from './model';
import { StaffPermissions } from './StaffPermissions';
import { staffManagerContent as texts } from './content';
import {
  acceptingApi,
  accessRefusingApi,
  administrator,
  administratorWithAllRights,
  administratorWithoutRights,
  pendingApi,
} from './fixtures';

/**
 * Права администратора: тринадцать разделов и пять опасных действий (ADR-344,
 * issue #786, #789).
 *
 * Экран есть только у администратора и только у владельца: у остальных ролей
 * доступ задан ролью целиком, а раздача прав закрыта владельческим адресом.
 */
const meta = {
  title: 'Админка/Права администратора',
  component: StaffPermissions,
  args: { staff: administrator, api: acceptingApi },
} satisfies Meta<typeof StaffPermissions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Часть разделов открыта: обычное состояние настроенной учётной записи. */
export const Обычное: Story = {};

/**
 * Только что заведённый администратор: не открыто ничего.
 *
 * 🔴 Это состояние по умолчанию, а не сбой: доступ, выдаваемый при заведении,
 * — это доступ, о котором никто не решал (ADR-344).
 */
export const НичегоНеОткрыто: Story = {
  args: { staff: administratorWithoutRights },
};

/** Открыто всё: восемнадцать переключателей во включённом положении. */
export const ОткрытоВсё: Story = {
  args: { staff: administratorWithAllRights },
};

/**
 * Несохранённые правки: переключатель тронут, кнопки ожили.
 *
 * Уход со страницы в этом состоянии спрашивает — вопрос ставит `useLeaveGuard`,
 * и увидеть его в кадре нельзя: он срабатывает на клик по ссылке.
 */
export const ЕстьНесохранённыеПравки: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText(ADMIN_PERMISSION_TITLES.catalog));
    await expect(canvas.getByRole('button', { name: new RegExp(texts.accessSave) })).toBeEnabled();
  },
};

/** Отправка: переключатели заблокированы, на кнопке индикатор. */
export const Сохранение: Story = {
  args: { api: pendingApi },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText(ADMIN_PERMISSION_TITLES.catalog));
    await userEvent.click(canvas.getByRole('button', { name: new RegExp(texts.accessSave) }));
  },
};

/** Сохранено: подтверждение стоит над кнопками, набор стал точкой отсчёта. */
export const Сохранено: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText(ADMIN_PERMISSION_TITLES.catalog));
    await userEvent.click(canvas.getByRole('button', { name: new RegExp(texts.accessSave) }));
    await expect(await canvas.findByText(texts.accessSaved)).toBeVisible();
  },
};

/**
 * Отказ сервера: переключатели остаются как их поставил человек — иначе
 * пришлось бы расставлять восемнадцать заново, а причина отказа могла быть
 * временной.
 */
export const ОтказСервера: Story = {
  args: { api: accessRefusingApi },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText(ADMIN_PERMISSION_TITLES.catalog));
    await userEvent.click(canvas.getByRole('button', { name: new RegExp(texts.accessSave) }));
    await expect(await canvas.findByRole('alert')).toBeVisible();
  },
};
