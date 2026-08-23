import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Icon } from './Icon';
import { iconRegistry, type IconName } from './registry';

/**
 * Весь набор разом. Витрина нужна не для красоты: разнобой в толщине и
 * посадке виден только когда иконки стоят рядом.
 */
const meta = {
  title: 'Кит/Icon',
  component: Icon,
  args: { name: 'phone', size: 24 },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {
  name: 'Весь набор',
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 20,
        color: 'var(--ink)',
      }}
    >
      {(Object.keys(iconRegistry) as IconName[]).map((name) => (
        <div key={name} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <Icon name={name} size={28} />
          <code style={{ fontSize: 11, color: 'var(--muted)' }}>{name}</code>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Размеры в строке',
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', color: 'var(--ink)' }}>
      {[14, 16, 18, 20, 24, 30].map((size) => (
        <Icon key={size} name="shield" size={size} />
      ))}
    </div>
  ),
};
