import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Chip } from './Chip';

/** Группа с одним выбранным — так чипы стоят в подборе по площади. */
function ChipGroupExample() {
  const options = ['Квартира', 'Частный дом', 'Офис'];
  const [active, setActive] = useState('Квартира');

  return (
    <div
      role="group"
      aria-label="Тип помещения"
      style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
    >
      {options.map((option) => (
        <Chip key={option} selected={option === active} onClick={() => setActive(option)}>
          {option}
        </Chip>
      ))}
    </div>
  );
}

const meta = {
  title: 'UI Kit/Chip',
  component: Chip,
  args: { children: 'Квартира' },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Selected: Story = { name: 'Выбран', args: { selected: true } };

export const Hover: Story = {
  name: 'Наведение',
  play: async ({ canvasElement }) => {
    const chip = within(canvasElement).getByRole('button');
    await userEvent.hover(chip);
    await expect(chip).toBeEnabled();
  },
};

export const Disabled: Story = { name: 'Отключён', args: { disabled: true } };

export const WithCount: Story = {
  name: 'Со счётчиком',
  args: { children: 'Инверторные', count: 12 },
};

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Chip {...args} size="sm">
        Мелкий
      </Chip>
      <Chip {...args} size="md">
        Средний
      </Chip>
    </div>
  ),
};

export const Group: Story = {
  name: 'Группа выбора',
  render: () => <ChipGroupExample />,
};

export const Empty: Story = {
  name: 'Пустая группа',
  render: () => <div style={{ color: 'var(--muted)' }}>Фильтры не заданы</div>,
};

/**
 * Чип со сбросом. Крестик — отдельная кнопка рядом, а не второй смысл того же
 * нажатия: «выбрать» и «сбросить» — разные действия, и промах по крестику не
 * должен снимать фильтр целиком.
 */
export const Removable: Story = {
  name: 'Со сбросом',
  render: (args) => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <Chip {...args} selected onRemove={() => undefined}>
        Квартира
      </Chip>
      <Chip {...args} onRemove={() => undefined}>
        Офис
      </Chip>
    </div>
  ),
};
