import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StockTable } from './StockTable';
import {
  archivedZone,
  bracket,
  emptyOverview,
  freon,
  longOverview,
  noThresholdOverview,
  noZonesOverview,
  overview,
  pipe,
  zones,
} from './fixtures';

const meta = {
  title: 'Админка/Склад · Остатки',
  component: StockTable,
  args: { overview },
} satisfies Meta<typeof StockTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обычный день: расходники, техника, одна позиция ниже порога. */
export const Базовое: Story = {};

/** Справочник перерос страницу: появляется разбивка. */
export const СоСтраницами: Story = {
  args: { overview: longOverview },
};

/** 🔴 Зон нет — раздел объясняет, что заводят сначала. */
export const БезЗон: Story = {
  args: { overview: noZonesOverview },
};

/** Справочник пуст: остаток появится после первого прихода. */
export const Пусто: Story = {
  args: { overview: emptyOverview },
};

/** Искали — не нашлось. Справочник при этом не пуст, и объяснение другое. */
export const НичегоНеНайдено: Story = {
  args: {
    overview: emptyOverview,
    filters: { query: 'труба', group: '', low: false, archived: false },
  },
};

/** «Только к заказу» и ничего ниже порога — тоже отдельное объяснение. */
export const НетКЗаказу: Story = {
  args: { overview: emptyOverview, filters: { query: '', group: '', low: true, archived: false } },
};

/** Ниже порога заказа: это и есть список «пора заказывать» без отдельного экрана. */
export const НижеПорога: Story = {
  args: { overview: { ...overview, items: [bracket], total: 1, lowCount: 1 } },
};

/** 🔴 Минус: склад разошёлся с реальностью — предупреждение, а не отказ. */
export const Минус: Story = {
  args: { overview: { ...overview, items: [freon], total: 1, lowCount: 0 } },
};

/** Машину продали: колонка ушла в архив, движения по ней остались. */
export const САрхивнойЗоной: Story = {
  // Допущение инвариантов — причина в reason (ADR-230)
  parameters: {
    invariants: {
      allow: [
        {
          rule: 'occlusion',
          reason:
            'issue #488 — кнопка строки уходит под липкую колонку при центрировании; видно только в образе Linux',
        },
      ],
    },
  },
  args: {
    overview: {
      ...overview,
      zones: [...zones, archivedZone],
      items: [pipe],
      total: 1,
      lowCount: 0,
    },
  },
};

/**
 * Монтажнику порог заказа не приходит вовсе: колонка не рисуется, а не
 * показывает прочерки (docs/API.md §14).
 */
export const БезПорога: Story = {
  args: { overview: noThresholdOverview },
};
