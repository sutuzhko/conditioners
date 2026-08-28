import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffCardView } from './StaffCardView';
import {
  acceptingApi,
  activeInstaller,
  contractInstaller,
  disabledInstaller,
  failingApi,
  namelessInstaller,
  selfEmployedNoInn,
  staffInstaller,
  unsetEmploymentInstaller,
} from './fixtures';

const meta = {
  title: 'Админка/Монтажник в списке',
  component: StaffCardView,
  args: { staff: activeInstaller, api: acceptingApi },
} satisfies Meta<typeof StaffCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Работает: Story = {};

export const ДоступЗакрыт: Story = {
  args: { staff: disabledInstaller },
};

/** Имя не заполнено — показываем логин, а не пустое место. */
export const БезИмени: Story = {
  args: { staff: namelessInstaller },
};

export const Самозанятый: Story = {
  args: { staff: activeInstaller },
};

/**
 * 🔴 Самозанятый без ИНН: оформление заведено, но проверить его статус на дату
 * выплаты нечем — карточка говорит об этом прямо в списке.
 */
export const СамозанятыйБезИНН: Story = {
  args: { staff: selfEmployedNoInn },
};

export const ДоговорГПХ: Story = {
  args: { staff: contractInstaller },
};

/** У работника по трудовому договору удержание — внутренняя пометка. */
export const ТрудовойДоговор: Story = {
  args: { staff: staffInstaller },
};

/**
 * Оформление не заведено: плашка предупреждает, а строка под фактами
 * объясняет последствие — наряд не уменьшает вознаграждение.
 */
export const ОформлениеНеЗаведено: Story = {
  args: { staff: unsetEmploymentInstaller },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
