import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffAccountForm } from './StaffAccountForm';
import {
  acceptingApi,
  activeInstaller,
  contractInstaller,
  disabledInstaller,
  fieldRefusingApi,
  staffInstaller,
  unsetEmploymentInstaller,
} from './fixtures';

const meta = {
  title: 'Админка/Аккаунт монтажника',
  component: StaffAccountForm,
  args: { staff: activeInstaller, api: acceptingApi, confirmRemove: async () => true },
} satisfies Meta<typeof StaffAccountForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Самозанятый: подсказка под выбором говорит про уменьшение вознаграждения. */
export const Самозанятый: Story = {};

export const ДоговорГПХ: Story = {
  args: { staff: contractInstaller },
};

/** Трудовой договор: подсказка обещает пометку, а не вычет из выплаты. */
export const ТрудовойДоговор: Story = {
  args: { staff: staffInstaller },
};

/** Оформление не заведено — состояние по умолчанию у только что заведённого. */
export const ОформлениеНеЗаведено: Story = {
  args: { staff: unsetEmploymentInstaller },
};

export const ДоступЗакрыт: Story = {
  args: { staff: disabledInstaller },
};

/** Сервер назвал поле — подсветка встаёт на логин, а не под форму. */
export const ЗанятыйЛогин: Story = {
  args: { api: fieldRefusingApi },
};
