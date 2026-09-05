import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { visibleColumns } from './columns';
import { OrderBulk } from './OrderBulk';
import { OrderTable } from './OrderTable';
import { freshOrder, installers, order } from './fixtures';

/** Момент отсчёта просрочки задан числом: иначе кадр менялся бы каждый день. */
const NOW = '2026-08-27T09:00:00.000Z';

const meta = {
  title: 'Админка/Заказы/Групповое действие',
  component: OrderBulk,
  args: {
    total: 24,
    pageCount: 2,
    installers,
    /* Подтверждение выведено пропом: история не открывает окно кита. */
    confirm: async () => true,
    onDone: () => undefined,
    children: (
      <OrderTable
        items={[order, freshOrder]}
        columns={visibleColumns('active')}
        selectable
        now={NOW}
      />
    ),
  },
} satisfies Meta<typeof OrderBulk>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Ничего не выбрано: полосы действия нет, место под неё не резервируется —
 * её появление двигает вниз список, а не кнопку, по которой целятся.
 */
export const Базовое: Story = {};

/** Назначать некому: галочек нет вовсе — выбор без действия бесполезен. */
export const БезМонтажников: Story = {
  args: { installers: [] },
};
