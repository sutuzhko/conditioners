import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Card, Skeleton } from '@/shared/ui';

import { DataBlock } from './DataBlock';

/**
 * Асинхронный блок панели: скелетон, данные, ошибка (issue #334, #336).
 *
 * Три истории — три состояния одного блока. Скелетон и данные стоят на одной
 * линии, ошибка занимает место данных, а не страницу целиком.
 */
const meta = {
  /* 🔴 Раздел `UI Kit/`, а не свой: списки разделов у снимков, инвариантов и
     измерений зашиты префиксами, и «Кит панели/» не попал бы ни в одну
     работу — единственный новый компонент фазы остался бы без проверок. */
  title: 'UI Kit/DataBlock',
  component: DataBlock,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DataBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Блок, который никогда не дождётся данных: так виден скелетон. */
function Never(): never {
  throw new Promise<never>(() => undefined);
}

/** Блок, который падает: так видна граница ошибки. */
function Broken(): never {
  throw new Error('Connection closed.');
}

const skeleton = (
  <Card>
    <div aria-busy="true" style={{ display: 'grid', gap: 12 }}>
      <Skeleton variant="block" height="46px" />
      <Skeleton variant="block" height="46px" />
      <Skeleton variant="block" height="46px" />
    </div>
  </Card>
);

export const Loading: Story = {
  name: 'Загрузка',
  args: { skeleton, title: 'Не удалось загрузить заявки', children: null },
  render: (args) => (
    <DataBlock {...args}>
      <Never />
    </DataBlock>
  ),
};

export const Ready: Story = {
  name: 'Данные пришли',
  args: { skeleton, title: 'Не удалось загрузить заявки', children: null },
  render: (args) => (
    <DataBlock {...args}>
      <Card>
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, minHeight: 46 }}>Заявка от Ивановой, монтаж</p>
          <p style={{ margin: 0, minHeight: 46 }}>Заявка от Петрова, обслуживание</p>
          <p style={{ margin: 0, minHeight: 46 }}>Заявка от Сидорова, ремонт</p>
        </div>
      </Card>
    </DataBlock>
  ),
};

export const Failed: Story = {
  name: 'Ошибка блока',
  args: {
    skeleton,
    title: 'Не удалось загрузить заявки',
    note: 'Сервер не ответил. Заявки при этом не потеряны — они записаны в базу и появятся, как только связь восстановится.',
    children: null,
  },
  render: (args) => (
    <DataBlock {...args}>
      <Broken />
    </DataBlock>
  ),
};
