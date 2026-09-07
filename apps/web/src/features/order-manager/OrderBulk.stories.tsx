import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { visibleColumns } from './columns';
import { orderManagerContent as texts } from './content';
import { OrderBulk } from './OrderBulk';
import { OrderTable } from './OrderTable';
import {
  failingBulkApi,
  freshOrder,
  installers,
  order,
  pendingBulkApi,
  selfEmployedInstaller,
} from './fixtures';

/** Момент отсчёта просрочки задан числом: иначе кадр менялся бы каждый день. */
const NOW = '2026-08-27T09:00:00.000Z';

/** Первая строка таблицы — контрольный элемент устойчивости (issue #738). */
const FIRST_ROW = '#storybook-root tbody tr';

const meta = {
  title: 'Админка/Заказы/Групповое действие',
  component: OrderBulk,
  /* 🔴 Истории идут внутри контейнера панели. Без `data-ui="panel"` высоты
     контролов, радиус карточки и её внутренние поля не объявлены вовсе
     (ADR-187): полоса рисовалась бы прямоугольником с высотами витрины, и
     проверка тап-зоны 44px на 390 показывала бы не то, что живёт на странице.
     Своих отступов обёртка не добавляет — ширина истории остаётся прежней, и
     таблица внутри меряется там же, где мерилась до этой задачи. */
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)' }}>
        <Story />
      </div>
    ),
  ],
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
 * Ничего не выбрано: панель стоит на месте, действия отключены и объясняют,
 * чего им не хватает.
 *
 * 🔴 Она же опорная для устойчивости (issue #738, ADR-212): верх первой
 * строки таблицы обязан стоять на одном месте при нуле, одной и всех
 * отмеченных строках, а также пока идёт отправка. Раньше панель появлялась по
 * первой галочке и уводила таблицу вниз на 74px вместе со строкой, по которой
 * целились: на телефоне отмечался не тот наряд.
 */
export const Базовое: Story = {
  parameters: {
    invariants: {
      stability: {
        control: FIRST_ROW,
        states: [
          'админка-заказы-групповое-действие--выбранаодна',
          'админка-заказы-групповое-действие--выбранывсе',
          'админка-заказы-групповое-действие--отправка',
        ],
      },
    },
  },
};

/** Отмечена одна строка: панель загорелась акцентом, назначение открылось. */
export const ВыбранаОдна: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText(texts.rowSelect(order.number)));
  },
};

/** Отмечена вся страница: галочка «выбрать все» отвечает за состояние ряда. */
export const ВыбраныВсе: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText(texts.selectAll));
  },
};

/** Отправка идёт: кнопка занята, поле и выход из режима не трогаются. */
export const Отправка: Story = {
  args: { api: pendingBulkApi },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText(texts.selectAll));
    await userEvent.selectOptions(
      canvas.getByLabelText(texts.bulkAssignLabel),
      selfEmployedInstaller.id,
    );
    await userEvent.click(canvas.getByRole('button', { name: texts.bulkAssign }));
  },
};

/**
 * Сервер отказал: причина названа словами, а выбор остаётся отмеченным —
 * повторить назначение можно, не расставляя галочки заново.
 */
export const ОтказСервера: Story = {
  args: { api: failingBulkApi },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText(texts.selectAll));
    await userEvent.selectOptions(
      canvas.getByLabelText(texts.bulkAssignLabel),
      selfEmployedInstaller.id,
    );
    await userEvent.click(canvas.getByRole('button', { name: texts.bulkAssign }));
  },
};

/** Назначать некому: полосы нет вовсе — выбор без действия бесполезен. */
export const БезМонтажников: Story = {
  args: { installers: [] },
};
