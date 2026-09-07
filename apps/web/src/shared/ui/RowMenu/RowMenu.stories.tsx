import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { RowMenu, type RowMenuItem } from './RowMenu';
import { Icon } from '../Icon';

const ITEMS: readonly RowMenuItem[] = [
  {
    id: 'open',
    label: 'Открыть наряд',
    icon: <Icon name="search" size={16} />,
    onSelect: () => {},
  },
  {
    id: 'call',
    label: 'Позвонить клиенту',
    icon: <Icon name="phone" size={16} />,
    onSelect: () => {},
  },
  { id: 'print', label: 'Печать наряда', icon: <Icon name="bill" size={16} />, onSelect: () => {} },
  {
    id: 'cancel',
    label: 'Отменить наряд',
    icon: <Icon name="close" size={16} />,
    onSelect: () => {},
    danger: true,
  },
];

const meta = {
  title: 'UI Kit/RowMenu',
  component: RowMenu,
  args: { items: ITEMS, label: 'Действия над нарядом № 1059' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div
        data-ui="panel"
        style={{
          background: 'var(--bg-soft)',
          padding: 16,
          minHeight: 280,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Закрыто' };

/** Открытое меню — состояние, ради которого компонент и существует. */
export const Open: Story = {
  name: 'Открыто',
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button');
    await userEvent.click(trigger);
  },
};

export const WithDisabled: Story = {
  name: 'С отключённым пунктом',
  args: {
    items: [
      ...ITEMS.slice(0, 2),
      { id: 'close', label: 'Закрыть наряд', onSelect: () => {}, disabled: true },
      ...ITEMS.slice(3),
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
  },
};

/** Меню из двух пунктов: минимум, при котором оно вообще нужно. */
export const Short: Story = {
  name: 'Два пункта',
  args: { items: ITEMS.slice(0, 2) },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
  },
};

/**
 * 🔴 Меню у последней строки таблицы: внизу окна места нет, и оно
 * раскрывается вверх. История нужна не ради вида — она вторая проверка
 * стороны (issue #689): размеры меню от неё не меняются, а корень портала
 * измерения пишут нулями (ADR-327), поэтому переворот виден только полем
 * `side` рядом с историей «Открыто».
 */
export const OpenUp: Story = {
  name: 'Открыто вверх',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'flex-end' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
  },
};

/** Без значков: они необязательны — смысл несёт подпись. */
export const NoIcons: Story = {
  name: 'Без значков',
  args: {
    items: ITEMS.map(({ id, label, onSelect, danger }) => ({ id, label, onSelect, danger })),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
  },
};
