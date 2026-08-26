import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientCardView } from './ClientCardView';
import { bareClient, client } from './fixtures';

const meta = {
  title: 'Админка/Клиент в списке',
  component: ClientCardView,
  args: { client },
} satisfies Meta<typeof ClientCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Заведён по звонку: ни адреса, ни заметки, ни обращений с сайта. */
export const ПоЗвонку: Story = {
  args: { client: bareClient },
};

/** Длинные адрес и заметка не должны рвать карточку. */
export const ДлинныеДанные: Story = {
  args: {
    client: {
      ...client,
      name: 'Александра Константинопольская-Черноморская',
      address:
        'Тульская область, Ленинский район, посёлок Иншинский, дом 22, корпус 3, квартира 145',
      note: 'Домофон не работает, звонить на телефон за пятнадцать минут. Пятый этаж без лифта, узкая лестница — блок заносить вдвоём. Собака во дворе, но не кусается.',
      leadCount: 11,
    },
  },
};
