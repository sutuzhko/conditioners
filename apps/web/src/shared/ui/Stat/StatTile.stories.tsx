import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StatTile, StatTiles } from './StatTile';

/**
 * Плитка показателя панели (issue #329). Числа в историях — выдуманные для
 * витрины кита, а не факты о компании: настоящие приходят из БД (инвариант 8).
 */
const meta = {
  title: 'UI Kit/StatTile',
  component: StatTile,
  args: { label: 'Заказы', value: '128', note: 'за последние 7 дней' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Growth: Story = {
  name: 'Рост',
  args: { delta: { trend: 'up', value: '+4' } },
};

export const Decline: Story = {
  name: 'Спад',
  args: { label: 'Отказы', value: '3', delta: { trend: 'down', value: '−3' } },
};

export const Flat: Story = {
  name: 'Без изменений',
  args: { label: 'Заявки', value: '12', delta: { trend: 'flat', value: '0' } },
};

/** Рост отказов — плохая новость: краску чипа переопределяет место вызова. */
export const InvertedTone: Story = {
  name: 'Рост с краской спада',
  args: {
    label: 'Просроченные наряды',
    value: '9',
    delta: { trend: 'up', value: '+2', tone: 'danger' },
    note: 'к прошлой неделе',
  },
};

export const WithSuffix: Story = {
  name: 'С хвостом после числа',
  args: { label: 'Выручка', value: '1 248 500', suffix: '₽', delta: { trend: 'up', value: '+8%' } },
};

export const WithoutNote: Story = {
  name: 'Без пояснения',
  args: { note: undefined, delta: { trend: 'up', value: '+4' } },
};

/** Пустой показатель: прочерк вместо нуля — «нет данных» и «ноль» это разное. */
export const Empty: Story = {
  name: 'Пусто',
  args: { value: '—', note: 'данных за период нет', delta: undefined },
};

/**
 * 🔴 Ряд из четырёх: четыре в ряд от 1200, две ниже. Здесь же видно главное
 * требование issue — чип не двигает число. Левый край всех четырёх чисел
 * совпадает независимо от того, есть ли у плитки чип и какой он ширины;
 * координата снята в браузере, а не оценена на глаз.
 */
export const Row: Story = {
  name: 'Ряд плиток',
  render: () => (
    <StatTiles label="Показатели недели">
      <StatTile label="Заказы" value="128" delta={{ trend: 'up', value: '+4' }} note="за 7 дней" />
      <StatTile label="Выручка" value="1 248 500" suffix="₽" note="за 7 дней" />
      <StatTile
        label="Отказы"
        value="3"
        delta={{ trend: 'down', value: '−3' }}
        note="к прошлой неделе"
      />
      <StatTile
        label="Просрочено"
        value="9"
        delta={{ trend: 'up', value: '+128', tone: 'danger' }}
        note="нарядов вне срока"
      />
    </StatTiles>
  ),
};

/** Тот же ряд без единого чипа: высота плиток обязана совпасть с рядом выше. */
export const RowWithoutDeltas: Story = {
  name: 'Ряд без чипов',
  render: () => (
    <StatTiles label="Показатели недели">
      <StatTile label="Заказы" value="128" note="за 7 дней" />
      <StatTile label="Выручка" value="1 248 500" suffix="₽" note="за 7 дней" />
      <StatTile label="Отказы" value="3" note="к прошлой неделе" />
      <StatTile label="Просрочено" value="9" note="нарядов вне срока" />
    </StatTiles>
  ),
};
