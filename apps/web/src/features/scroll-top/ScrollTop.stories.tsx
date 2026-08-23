import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ScrollTop } from './ScrollTop';

/**
 * Кнопка возврата к началу. В историях страница короткая, поэтому кнопка
 * прячется по своему же правилу — её показывает высокий блок ниже.
 */
const meta = {
  title: 'Блоки/Кнопка наверх',
  component: ScrollTop,
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ minHeight: '260vh', padding: 24 }}>
      <p>Прокрутите вниз: кнопка появляется после двух экранов.</p>
      <ScrollTop />
    </div>
  ),
} satisfies Meta<typeof ScrollTop>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'На длинной странице' };
