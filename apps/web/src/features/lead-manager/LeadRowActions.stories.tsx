import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LeadRowActions } from './LeadRowActions';
import { acceptingRemove, failingRemove } from './fixtures';

/**
 * Действия строки очереди (issue #601): позвонить и удалить.
 *
 * 🔴 Меню, а не три круглые кнопки со значками, как в макете: у кита нет
 * значков «глаз», «карандаш» и «корзина», а кнопка без подписи и без значка не
 * читается вовсе (ADR-307 §2, PIXEL_SPEC §«Отступления панели»).
 *
 * Окно подтверждения в витрине не открывается: у диалога свои истории.
 */
const meta = {
  title: 'Админка/Действия строки заявки',
  component: LeadRowActions,
  args: {
    id: 'l1',
    number: 41,
    phone: '+79001234567',
    remove: acceptingRemove,
    confirmRemove: async () => true,
  },
} satisfies Meta<typeof LeadRowActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Сервер отказал: сообщение остаётся у строки, а не теряется в шапке. */
export const ОтказСервера: Story = {
  args: { remove: failingRemove },
};
