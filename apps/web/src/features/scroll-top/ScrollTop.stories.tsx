import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ScrollTop } from './ScrollTop';

/**
 * Кнопка возврата к началу. В историях страница короткая, поэтому кнопка
 * прячется по своему же правилу — её показывает высокий блок ниже.
 *
 * 🔴 Ниже 600 кнопки нет вовсе: там её место у нижнего края занимает липкая
 * панель действий. На узких ширинах история пустая — и это верно.
 */
const meta = {
  title: 'Блоки/Кнопка наверх',
  component: ScrollTop,
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ minHeight: '260vh', padding: 24 }}>
      <p>Прокрутите вниз: кнопка появляется после двух экранов и с ширины 600.</p>
      <ScrollTop />
    </div>
  ),
} satisfies Meta<typeof ScrollTop>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'На длинной странице' };
