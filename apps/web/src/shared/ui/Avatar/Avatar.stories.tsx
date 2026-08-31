import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Avatar, AvatarGroup } from './Avatar';

const meta = {
  title: 'UI Kit/Avatar',
  component: Avatar,
  args: { name: 'Иванов Иван' },
  parameters: { layout: 'padded' },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
    </div>
  ),
};

/** Имя из одного слова: буква одна, а не выдуманная вторая. */
export const SingleWord: Story = { name: 'Одно слово', args: { name: 'Иванов' } };

export const LongName: Story = {
  name: 'Длинное имя',
  args: { name: 'Константинопольский Владислав' },
};

export const Group: Story = {
  name: 'Ряд аватаров',
  render: () => (
    <AvatarGroup label="Монтажники на наряде">
      <Avatar name="Иванов Иван" />
      <Avatar name="Петров Олег" />
      <Avatar name="Сидорова Анна" />
    </AvatarGroup>
  ),
};

/** Остаток числом, а не многоточием: «и ещё кто-то» ничего не сообщает. */
export const GroupWithOverflow: Story = {
  name: 'Ряд с остатком',
  render: () => (
    <AvatarGroup label="Монтажники на наряде" overflow={4}>
      <Avatar name="Иванов Иван" />
      <Avatar name="Петров Олег" />
      <Avatar name="Сидорова Анна" />
    </AvatarGroup>
  ),
};

export const GroupSizes: Story = {
  name: 'Ряды всех размеров',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <AvatarGroup key={size} label={`Монтажники ${size}`} size={size} overflow={2}>
          <Avatar name="Иванов Иван" size={size} />
          <Avatar name="Петров Олег" size={size} />
        </AvatarGroup>
      ))}
    </div>
  ),
};

/** Один в ряду: нахлёста нет, и ряд не шире одного аватара. */
export const GroupOfOne: Story = {
  name: 'Один в ряду',
  render: () => (
    <AvatarGroup label="Монтажник на наряде">
      <Avatar name="Иванов Иван" />
    </AvatarGroup>
  ),
};
