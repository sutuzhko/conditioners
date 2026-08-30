import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from './Badge';

const meta = {
  title: 'UI Kit/Badge',
  component: Badge,
  args: { children: 'Инвертор' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: [
        'neutral',
        'accent',
        'success',
        'warning',
        'danger',
        'info',
        'dark',
        'onPanel',
        'sale',
      ],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <Badge {...args} variant="neutral">
        Нейтральная
      </Badge>
      <Badge {...args} variant="accent">
        Акцентная
      </Badge>
      <Badge {...args} variant="dark">
        Класс 09
      </Badge>
      <Badge {...args} variant="success">
        Опубликован
      </Badge>
      <Badge {...args} variant="warning">
        На модерации
      </Badge>
      <Badge {...args} variant="sale">
        −12%
      </Badge>
    </div>
  ),
};

export const Sale: Story = {
  name: 'Плашка скидки',
  args: { variant: 'sale', children: '−12%' },
};

export const Mono: Story = {
  name: 'Техническая метка',
  args: { mono: true, variant: 'accent', children: 'Схема 1' },
};

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Badge {...args} size="sm" variant="accent">
        24 · sm
      </Badge>
      <Badge {...args} size="md" variant="accent">
        28 · md
      </Badge>
      <Badge {...args} size="lg" variant="accent">
        28 · lg, кегль на ступень выше
      </Badge>
    </div>
  ),
};

export const LongLabel: Story = {
  name: 'Длинная подпись',
  args: { variant: 'accent', children: 'Гарантия на монтаж до трёх лет' },
};

/**
 * Текст приходит из настроек, длину задаёт владелец — переносим (ADR-126).
 * Ширина истории сужена нарочно: без переноса такая плашка уезжает за край,
 * ровно как капсула выезда на первом экране.
 */
export const Wrapped: Story = {
  name: 'Текст из настроек — с переносом',
  args: {
    variant: 'accent',
    wrap: true,
    children: 'Тула и область — выезд в день обращения, замер и расчёт сметы бесплатно',
  },
  render: (args) => (
    <div style={{ maxWidth: 260 }}>
      <Badge {...args} />
    </div>
  ),
};

/**
 * 🔴 Шесть красок панели и ни одной седьмой. У каждой плашки есть слово:
 * шесть красок различает не всякий глаз, а на чёрно-белой печати наряда они
 * совпадают все. Точка усиливает краску, но подписи не заменяет.
 */
export const StatusDictionary: Story = {
  name: 'Словарь статусов',
  render: (args) => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <Badge {...args} variant="neutral" dot>
        Новый
      </Badge>
      <Badge {...args} variant="warning" dot>
        Назначен
      </Badge>
      <Badge {...args} variant="accent" dot>
        В работе
      </Badge>
      <Badge {...args} variant="success" dot>
        Выполнен
      </Badge>
      <Badge {...args} variant="danger" dot>
        Отказ
      </Badge>
      <Badge {...args} variant="info" dot>
        В очереди
      </Badge>
    </div>
  ),
};

/** Снятый фильтр над таблицей: крестик — настоящая кнопка со своим именем. */
export const Removable: Story = {
  name: 'Со снятием',
  render: (args) => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <Badge {...args} variant="accent" onRemove={() => undefined}>
        Монтаж
      </Badge>
      <Badge {...args} variant="neutral" size="lg" onRemove={() => undefined}>
        Этот месяц
      </Badge>
    </div>
  ),
};
