import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PanelTabLinks } from './PanelTabLinks';

/**
 * Вкладки-ссылки: за каждой стоит свой запрос к базе (issue #352).
 *
 * Своего JS у переключателя нет — историю и переход делает браузер.
 */
const meta = {
  title: 'Админка/Вкладки-ссылки панели',
  component: PanelTabLinks,
  args: {
    active: 'stock',
    tabs: ['stock', 'log', 'zones'],
    titleOf: (tab: string) =>
      ({ stock: 'Остатки по зонам', log: 'Журнал движений', zones: 'Зоны хранения' })[tab] ?? tab,
    label: 'Разделы склада',
    hrefOf: (tab: string) => ({
      pathname: '/admin/stock',
      query: tab === 'stock' ? {} : { tab },
    }),
  },
} satisfies Meta<typeof PanelTabLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

export const ЖурналДвижений: Story = {
  args: { active: 'log' },
};

/** Заготовка раздела: открытой вкладки нет — адреса `loading.tsx` не знает. */
export const БезВыбранной: Story = {
  args: { active: undefined },
};
