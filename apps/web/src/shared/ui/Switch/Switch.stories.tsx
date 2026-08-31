import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Switch } from './Switch';

const meta = {
  title: 'UI Kit/Switch',
  component: Switch,
  args: { label: 'Активен' },
  parameters: { layout: 'padded' },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const On: Story = { name: 'Включён', args: { defaultChecked: true } };

export const Disabled: Story = { name: 'Отключён', args: { disabled: true } };

export const DisabledOn: Story = {
  name: 'Отключён и включён',
  args: { disabled: true, defaultChecked: true },
};

export const WithHint: Story = {
  name: 'С подсказкой',
  args: { hint: 'Выключенный монтажник не получает наряды' },
};

export const WithError: Story = {
  name: 'Ошибка',
  args: { error: 'Нельзя выключить последнего владельца' },
};

export const LabelFirst: Story = {
  name: 'Подпись слева',
  args: { labelFirst: true, hint: 'Так стоят флаги в настройках' },
};

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Switch {...args} size="sm" label="Малый" />
      <Switch {...args} size="md" label="Средний" defaultChecked />
      <Switch {...args} size="lg" label="Крупный" />
    </div>
  ),
};

export const Focus: Story = {
  name: 'Фокус с клавиатуры',
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole('switch');
    await userEvent.tab();
    await expect(control).toHaveFocus();
  },
};

/** Ряд флагов настроек — то, ради чего компонент и заведён. */
export const SettingsRow: Story = {
  name: 'Ряд флагов',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380 }}>
      <Switch {...args} labelFirst label="Показывать телефон в шапке" defaultChecked />
      <Switch {...args} labelFirst label="Принимать заявки ночью" />
      <Switch {...args} labelFirst label="Дублировать заявки в Telegram" defaultChecked />
    </div>
  ),
};
