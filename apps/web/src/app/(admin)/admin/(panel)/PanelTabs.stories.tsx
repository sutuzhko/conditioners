import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PanelTabs } from './PanelTabs';

/**
 * Лента вкладок панели — одна на карточку клиента, карточку монтажника и
 * склад (issue #350, #351, #352).
 *
 * 🔴 Вид — подчёркивание, а не пилюля, и различие смысловое: пилюлями в
 * панели отмечен фильтр списка, подчёркиванием — часть одного экрана.
 *
 * Адрес правится `history.pushState`: данные всех вкладок карточка уже
 * получила, и переход роутера собирал бы её заново (ADR-256).
 */
const meta = {
  title: 'Админка/Вкладки панели',
  component: PanelTabs,
  args: {
    active: 'data',
    tabs: ['data', 'orders', 'units'],
    titles: { data: 'Данные', orders: 'Заказы', units: 'Техника' },
    label: 'Карточка клиента',
    idPrefix: 'demo',
    panels: {
      data: <p>Форма клиента: имя, телефон, адрес, заметка.</p>,
      orders: <p>История заказов: наряды с суммами и статусами.</p>,
      units: <p>Установленная техника: модель, гарантия, дата ТО.</p>,
    },
  },
} satisfies Meta<typeof PanelTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Открыта не первая вкладка: так карточка приходит по прямой ссылке. */
export const ВтораяВкладка: Story = {
  args: { active: 'orders' },
};

/** Четыре вкладки с длинной подписью — карточка монтажника. */
export const ЧетыреВкладки: Story = {
  args: {
    active: 'payouts',
    tabs: ['account', 'orders', 'payouts', 'notes'],
    titles: {
      account: 'Аккаунт',
      orders: 'Заказы',
      payouts: 'Выплаты и удержания',
      notes: 'Заметки владельца',
    },
    label: 'Карточка монтажника',
    idPrefix: 'staff-demo',
    panels: {
      account: <p>Имя, логин, телефон, пароль и оформление.</p>,
      orders: <p>Наряды монтажника.</p>,
      payouts: <p>Выплаты и удержания.</p>,
      notes: <p>Заметки владельца: монтажник их не видит.</p>,
    },
  },
};
