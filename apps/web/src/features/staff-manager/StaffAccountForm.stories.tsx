import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StaffAccountForm } from './StaffAccountForm';
import { staffManagerContent as texts } from './content';
import {
  acceptingApi,
  activeInstaller,
  contractInstaller,
  disabledInstaller,
  fieldRefusingApi,
  selfEmployedNoInn,
  staffInstaller,
  unsetEmploymentInstaller,
} from './fixtures';

const meta = {
  title: 'Админка/Аккаунт монтажника',
  component: StaffAccountForm,
  args: { staff: activeInstaller, api: acceptingApi },
} satisfies Meta<typeof StaffAccountForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Самозанятый: подсказка под выбором говорит про уменьшение вознаграждения. */
export const Самозанятый: Story = {};

export const ДоговорГПХ: Story = {
  args: { staff: contractInstaller },
};

/**
 * 🔴 Самозанятый без ИНН: поле пустое, а под формой стоит предупреждение —
 * статус на дату выплаты проверить нечем. Сохранение при этом не блокируется.
 */
export const СамозанятыйБезИНН: Story = {
  args: { staff: selfEmployedNoInn },
};

/** Трудовой договор: подсказка обещает пометку, а не вычет из выплаты. */
export const ТрудовойДоговор: Story = {
  args: { staff: staffInstaller },
};

/**
 * Перевод штатного на самозанятость: выбор оформления сменён, и сохранение
 * спросит подтверждение — услуги бывшему работодателю под НПД закрыты на два
 * года (ФЗ-422). Диалог настоящий: подмены `confirmEmployment` здесь нет.
 */
export const ПереводНаСамозанятость: Story = {
  args: { staff: staffInstaller },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText(texts.employment), 'self_employed');
    await userEvent.click(canvas.getByRole('button', { name: texts.save }));
  },
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
