import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ArrowIcon, CheckIcon, ClockIcon, PhoneIcon, ShieldIcon } from './icons';

const meta = {
  title: 'UI Kit/Icons',
  component: ArrowIcon,
  args: { size: 24 },
  argTypes: { size: { control: { type: 'number', min: 12, max: 64 } } },
} satisfies Meta<typeof ArrowIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

const all = [
  ['ArrowIcon', ArrowIcon],
  ['PhoneIcon', PhoneIcon],
  ['ClockIcon', ClockIcon],
  ['ShieldIcon', ShieldIcon],
  ['CheckIcon', CheckIcon],
] as const;

export const Basic: Story = {
  name: 'Общий набор',
  render: (args) => (
    <ul
      style={{
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        color: 'var(--ink)',
      }}
    >
      {all.map(([name, Icon]) => (
        <li key={name} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <Icon {...args} />
          <code style={{ color: 'var(--muted)', fontSize: 12 }}>{name}</code>
        </li>
      ))}
    </ul>
  ),
};
