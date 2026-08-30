import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ActionBarView } from './ActionBarView';
import { contactsFixture, contactsWithoutPhone } from './fixtures';

/**
 * Полоса содержимого под панелью: без неё не видно ни стекла, ни границы, ни
 * того, что панель действительно накрывает страницу.
 */
function Page() {
  return (
    <div style={{ height: '100vh', padding: '32px 16px', color: 'var(--muted)' }}>
      Панель прижата к нижнему краю. На странице она появляется, когда первый экран уехал вверх, и
      уходит, когда в кадре форма заявки.
    </div>
  );
}

/**
 * Показывается `ActionBarView`, а не `ActionBar`: правила появления завязаны
 * на прокрутку настоящей страницы, и в истории панель иначе не увидеть.
 */
const meta = {
  title: 'Блоки/Панель действий',
  component: ActionBarView,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'sm' } },
  args: { contacts: contactsFixture, leadHref: '/#lead' },
  render: (args) => (
    <>
      <Page />
      <ActionBarView {...args} />
    </>
  ),
} satisfies Meta<typeof ActionBarView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Телефон 375 — звонок и заявка' };

export const Narrow: Story = {
  name: 'Минимум 320 — подписи не переносятся',
  globals: { viewport: { value: 'xs' } },
};

export const WithCompare: Story = {
  name: 'В каталоге — счётчик сравнения',
  args: { compare: { count: 2, href: '/compare' } },
};

export const WithoutPhone: Story = {
  name: 'Телефон не заполнен — остаётся заявка',
  args: { contacts: contactsWithoutPhone },
};
