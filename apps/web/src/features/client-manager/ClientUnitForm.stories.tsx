import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientUnitForm } from './ClientUnitForm';
import { acceptingUnitApi, failingUnitApi, unit } from './fixtures';

const meta = {
  title: 'Админка/Форма техники клиента',
  component: ClientUnitForm,
  args: { clientId: 'c1', api: acceptingUnitApi },
} satisfies Meta<typeof ClientUnitForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Руками заводят то, что поставили до этой системы или не мы. */
export const Заведение: Story = {};

export const Правка: Story = {
  args: { unit, onCancel: () => undefined },
};

/** Сервер назвал поле: дата монтажа задаёт и гарантию, и срок ТО. */
export const ОшибкаПоля: Story = {
  args: { api: failingUnitApi },
};
