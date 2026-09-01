import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { CardBody, CardHeader } from '../Card/CardBelt';
import { EmptyState } from './EmptyState';

/**
 * Пустое состояние блока (issue #335).
 *
 * 🔴 Две истории рядом не для красоты: «пусто» и «ничего не найдено» выглядят
 * одинаково пустыми, а шаги у них противоположные. Пока они стоят порознь,
 * разницу не видно — а владелец жмёт «Проверить уведомления» там, где надо
 * сбросить фильтр.
 */
const meta = {
  title: 'UI Kit/EmptyState',
  component: EmptyState,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: 'Пусто — записей нет вовсе',
  args: {
    icon: 'leads',
    title: 'Заявок пока нет',
    children:
      'Они появятся здесь, как только кто-то отправит форму с сайта. Проверьте, что форма открывается и уведомления настроены.',
    action: (
      <Button size="sm" variant="bordered">
        Проверить уведомления
      </Button>
    ),
  },
};

export const NotFound: Story = {
  name: 'Ничего не найдено — фильтр отсёк',
  args: {
    icon: 'search',
    title: 'Ничего не найдено',
    children: 'По выбранным фильтрам заявок нет.',
    action: (
      <Button size="sm" variant="bordered">
        Сбросить фильтры
      </Button>
    ),
  },
};

/** Без действия: раздел, где следующего шага у человека просто нет. */
export const WithoutAction: Story = {
  name: 'Без действия',
  args: {
    icon: 'stock',
    title: 'Расхода по наряду нет',
    children: 'Материалы спишет монтажник, когда закроет наряд.',
  },
};

/** В карточке — так это и стоит в разделах панели. */
export const InCard: Story = {
  name: 'Внутри карточки раздела',
  args: { icon: 'leads', title: '', children: '' },
  render: () => (
    <Card padding="none">
      <CardHeader title="Заявки" subtitle="Фильтр: новые" />
      <CardBody>
        <EmptyState
          icon="search"
          title="Ничего не найдено"
          action={<Button size="sm">Сбросить фильтры</Button>}
        >
          По выбранным фильтрам заявок нет. Всего заявок — 14.
        </EmptyState>
      </CardBody>
    </Card>
  ),
};

/** Оба состояния рядом: видно, что они не взаимозаменяемы. */
export const Both: Story = {
  name: 'Оба состояния рядом',
  args: { icon: 'leads', title: '', children: '' },
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card>
        <EmptyState
          icon="leads"
          title="Заявок пока нет"
          action={
            <Button size="sm" variant="bordered">
              Проверить уведомления
            </Button>
          }
        >
          Они появятся здесь, как только кто-то отправит форму с сайта.
        </EmptyState>
      </Card>
      <Card>
        <EmptyState
          icon="search"
          title="Ничего не найдено"
          action={
            <Button size="sm" variant="bordered">
              Сбросить фильтры
            </Button>
          }
        >
          По выбранным фильтрам заявок нет.
        </EmptyState>
      </Card>
    </div>
  ),
};
