import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { CardBody, CardHeader } from '../Card/CardBelt';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from './ErrorState';

/**
 * Ошибка блока (issue #336).
 *
 * Ошибка говорит, что произошло, что с данными и что делать. Успокоить
 * владельца здесь важнее, чем показать код ответа: «заявки не потеряны» — это
 * то, ради чего он смотрит на экран.
 */
const meta = {
  title: 'UI Kit/ErrorState',
  component: ErrorState,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

const actions = (
  <>
    <Button size="sm">Повторить</Button>
    <Button size="sm" variant="light">
      Обновить страницу
    </Button>
  </>
);

export const Default: Story = {
  name: 'Ошибка блока',
  args: {
    title: 'Не удалось загрузить заявки',
    children:
      'Сервер не ответил. Заявки при этом не потеряны — они записаны в базу и появятся, как только связь восстановится.',
    actions,
  },
};

/** Ожидание ответа: «Повторить» занято, второе действие остаётся доступным. */
export const Retrying: Story = {
  name: 'Повторяем запрос',
  args: {
    title: 'Не удалось загрузить заявки',
    children: 'Сервер не ответил. Заявки при этом не потеряны — они записаны в базу.',
    actions: (
      <>
        <Button size="sm" loading>
          Повторить
        </Button>
        <Button size="sm" variant="light">
          Обновить страницу
        </Button>
      </>
    ),
  },
};

/** В карточке раздела — так это и стоит в панели. */
export const InCard: Story = {
  name: 'Внутри карточки раздела',
  args: { title: '', children: '' },
  render: () => (
    <Card padding="none">
      <CardHeader title="Заявки" />
      <CardBody>
        <ErrorState title="Не удалось загрузить заявки" actions={actions}>
          Сервер не ответил. Заявки при этом не потеряны — они записаны в базу и появятся, как
          только связь восстановится.
        </ErrorState>
      </CardBody>
    </Card>
  ),
};

/** Рядом с пустым состоянием: одна анатомия, разный тон и разные действия. */
export const BesideEmpty: Story = {
  name: 'Рядом с пустым состоянием',
  args: { title: '', children: '' },
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
        <ErrorState title="Не удалось загрузить заявки" actions={actions}>
          Сервер не ответил. Заявки при этом не потеряны — они записаны в базу.
        </ErrorState>
      </Card>
    </div>
  ),
};
