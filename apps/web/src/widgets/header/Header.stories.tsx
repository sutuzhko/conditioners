import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Header } from './Header';
import {
  companyEmpty,
  companyFixture,
  companyPlaceholder,
  contactsEmpty,
  contactsFixture,
  contactsPlaceholder,
  navFixture,
} from './fixtures';

/** Полоса контента под шапкой: без неё не видно ни стекла, ни залипания. */
function Page() {
  return (
    <div
      style={{
        height: '160vh',
        background: 'var(--hero-grad)',
        padding: '32px 24px',
        color: 'var(--muted)',
      }}
    >
      Прокрутите страницу — шапка залипает сверху и остаётся полупрозрачной.
    </div>
  );
}

const meta = {
  title: 'Блоки/Шапка',
  component: Header,
  parameters: { layout: 'fullscreen' },
  args: { company: companyFixture, contacts: contactsFixture, nav: navFixture },
  render: (args) => (
    <>
      <Header {...args} />
      <Page />
    </>
  ),
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = { name: 'Десктоп 1200' };

export const Tablet: Story = {
  name: 'Планшет 768 — навигация в бургере',
  globals: { viewport: { value: 'md' } },
};

export const Phone: Story = {
  name: 'Телефон 375',
  globals: { viewport: { value: 'sm' } },
};

export const Narrow: Story = {
  name: 'Минимум 320',
  globals: { viewport: { value: 'xs' } },
};

export const Placeholders: Story = {
  name: 'Данные компании ещё заглушки',
  args: { company: companyPlaceholder, contacts: contactsPlaceholder },
};

export const WithoutContacts: Story = {
  name: 'Настройки пустые',
  args: { company: companyEmpty, contacts: contactsEmpty },
};

export const WithoutNav: Story = {
  name: 'Навигация не задана',
  args: { nav: [] },
};

export const MenuOpen: Story = {
  name: 'Открытие и закрытие меню',
  globals: { viewport: { value: 'sm' } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Открыть меню' }));
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(within(dialog).getByRole('link', { name: 'Монтаж' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};
