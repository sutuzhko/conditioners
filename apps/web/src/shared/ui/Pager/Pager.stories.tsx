import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Pager } from './Pager';

const meta = {
  title: 'UI Kit/Pager',
  component: Pager,
  args: { page: 2, pages: 7, basePath: '/admin/clients' },
} satisfies Meta<typeof Pager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const First: Story = {
  name: 'Первая страница',
  args: { page: 1 },
};

export const Last: Story = {
  name: 'Последняя страница',
  args: { page: 7 },
};

/** Список уместился на одну страницу — разбивки быть не должно. */
export const Single: Story = {
  name: 'Одна страница',
  args: { page: 1, pages: 1 },
};

/** Поиск переезжает вместе со страницей, иначе «Дальше» сбрасывает запрос. */
export const WithQuery: Story = {
  name: 'С сохранённым поиском',
  args: { query: { q: 'Соколов' } },
};

/**
 * Разбивка в панели (issue #330): шаги — пилюли высотой `--h-sm`, текущее
 * положение залито. Полосы номеров у компонента нет намеренно — восемь
 * записей на страницу дают десятки страниц уже на второй сотне клиентов.
 */
export const InPanel: Story = {
  name: 'В панели',
  render: (args) => (
    <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
      <Pager {...args} />
    </div>
  ),
};

/** Край списка: шаг остаётся на месте, чтобы положение не прыгало вбок. */
export const InPanelLast: Story = {
  name: 'В панели — последняя',
  args: { page: 7 },
  render: (args) => (
    <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
      <Pager {...args} />
    </div>
  ),
};

/**
 * Полоса номеров (issue #602, макет). Края, соседи текущей страницы и
 * многоточия на разрывах: полная лента на двадцати шести страницах — ряд, по
 * которому никто не целится.
 */
export const СНомерами: Story = {
  args: { page: 3, pages: 9, numbers: true },
};

/** Двадцать шесть страниц: ряд остаётся коротким, края доступны в одно нажатие. */
export const СНомерамиИРазрывами: Story = {
  args: { page: 13, pages: 26, numbers: true },
};
