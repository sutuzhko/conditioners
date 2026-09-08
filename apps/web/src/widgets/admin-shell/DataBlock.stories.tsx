import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';

import { Button, Card, EmptyState, Skeleton } from '@/shared/ui';

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

/**
 * Раздел вокруг блока — issue #579, #583.
 *
 * 🔴 Блок в историях стоит не один, потому что доказывать надо не его вид, а
 * его положение: контрольный элемент над блоком обязан стоять на одной
 * координате во всех четырёх состояниях. Шапка и вкладки для этого и нужны —
 * они и есть то, что уезжало вниз, пока блок и его окружение приезжали одним
 * куском (issue #495: у отзывов вкладки и отбор жили внутри блока).
 *
 * `data-frame` — не оформление, а зацепка: по ней замер находит узлы, чьи
 * координаты сравниваются между историями.
 */
function Frame({ children }: { readonly children: ReactNode }) {
  return (
    <div data-frame="section" style={{ display: 'grid', gap: 16 }}>
      <h2 data-frame="head" style={{ margin: 0, font: '600 20px/28px var(--font-display)' }}>
        Заявки
      </h2>

      {/* Лента вкладок: от данных не зависит и обязана стоять на месте. */}
      <nav data-frame="tabs" style={{ display: 'flex', gap: 8 }} aria-label="Показать заявки">
        <Button type="button" size="sm" variant="flat">
          Новые
        </Button>
        <Button type="button" size="sm" variant="light">
          В работе
        </Button>
      </nav>

      <div data-frame="block">{children}</div>
    </div>
  );
}

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
    <Frame>
      <DataBlock {...args}>
        <Never />
      </DataBlock>
    </Frame>
  ),
};

export const Ready: Story = {
  name: 'Данные пришли',
  args: { skeleton, title: 'Не удалось загрузить заявки', children: null },
  render: (args) => (
    <Frame>
      <DataBlock {...args}>
        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, minHeight: 46 }}>Заявка от Ивановой, монтаж</p>
            <p style={{ margin: 0, minHeight: 46 }}>Заявка от Петрова, обслуживание</p>
            <p style={{ margin: 0, minHeight: 46 }}>Заявка от Сидорова, ремонт</p>
          </div>
        </Card>
      </DataBlock>
    </Frame>
  ),
};

/**
 * Пустой блок — четвёртое состояние, без которого три остальных не полны
 * (issue #580, макет `States`, «Пусто»).
 *
 * 🔴 Пустота — это ответ, а не отсутствие ответа: она называет причину и даёт
 * следующий шаг. Здесь показан раздел без единой записи; «ничего не нашлось
 * по отбору» — другой текст и другое действие, и живёт оно в историях самих
 * разделов, потому что адрес сброса у каждого свой.
 */
export const Empty: Story = {
  name: 'Пусто',
  args: { skeleton, title: 'Не удалось загрузить заявки', children: null },
  render: (args) => (
    <Frame>
      <DataBlock {...args}>
        <Card>
          <EmptyState
            icon="leads"
            title="Заявок пока нет"
            action={
              <Button type="button" size="sm" variant="bordered">
                Проверить уведомления
              </Button>
            }
          >
            Они появятся здесь, как только кто-то отправит форму с сайта. Проверьте, что форма
            открывается и уведомления настроены.
          </EmptyState>
        </Card>
      </DataBlock>
    </Frame>
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
    <Frame>
      <DataBlock {...args}>
        <Broken />
      </DataBlock>
    </Frame>
  ),
};

/**
 * Отказ блока, которым была одна строка, — issue #890.
 *
 * 🔴 История показывает не вид ошибки, а её размер. Строка счёта над списком
 * и сам список падают вместе: они читают одни и те же данные. Пока у обоих
 * была одна поверхность, раздел показывал **две одинаковые карточки** с двумя
 * парами кнопок — одна беда выглядела как две, и «Повторить» двоилось.
 *
 * Теперь строка отвечает строкой, а карточка с действиями остаётся у блока,
 * ради которого раздел открывают.
 */
export const FailedLine: Story = {
  name: 'Ошибка блока-строки',
  args: {
    skeleton,
    title: 'Не удалось загрузить заявки',
    note: 'Сервер не ответил. Заявки при этом не потеряны — они записаны в базу и появятся, как только связь восстановится.',
    children: null,
  },
  render: (args) => (
    <Frame>
      <div style={{ display: 'grid', gap: 16 }}>
        <DataBlock
          {...args}
          surface="line"
          skeleton={<p style={{ margin: 0 }}>Новых заявок 3 из 27</p>}
        >
          <Broken />
        </DataBlock>

        <DataBlock {...args}>
          <Broken />
        </DataBlock>
      </div>
    </Frame>
  ),
};
