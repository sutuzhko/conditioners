import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { crmContent as texts } from './content';
import {
  clashingRepair,
  doctorBlock,
  installers,
  monthBlocks,
  monthEvents,
  monthLeads,
  monthOrders,
  morningInstall,
  parallelService,
  viewerId,
  wholeDayBlock,
} from './fixtures';
import { dayColumns, marksOf, weekColumns, type ScheduleSource } from './schedule';
import { TimeGrid } from './TimeGrid';

/** 23 августа 2026, воскресенье — день, на который заведены фикстуры. */
const DAY = '2026-08-23';

function source(patch: Partial<ScheduleSource> = {}): ScheduleSource {
  return {
    events: monthEvents,
    orders: monthOrders,
    leads: monthLeads,
    blocks: [],
    viewerId,
    today: DAY,
    selected: DAY,
    ...patch,
  };
}

const meta = {
  title: 'Админка/Календарь/Сетка часов',
  component: TimeGrid,
  parameters: { layout: 'padded' },
  args: {
    columns: weekColumns(source(), DAY),
    view: 'week',
    // 14:20 по московскому времени: линия «сейчас» видна в рабочем окне
    nowMin: 14 * 60 + 20,
    label: texts.weekLabel,
  },
} satisfies Meta<typeof TimeGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Неделя колонками дней: наряды, дела и заявки вперемешку. */
export const Неделя: Story = {};

/** Пустая неделя — первые дни после установки панели. */
export const НеделяПустая: Story = {
  args: {
    columns: weekColumns(source({ events: [], orders: [], leads: [] }), DAY),
  },
};

/** Занятость в сетке: закрытый целиком день и запись к врачу на два часа. */
export const НеделяСЗанятостью: Story = {
  args: {
    columns: weekColumns(source({ blocks: monthBlocks }), '2026-08-26'),
  },
};

/** День по часам с линией «сейчас» — вид, в котором планируют выезды. */
export const День: Story = {
  args: {
    columns: dayColumns(source(), DAY),
    view: 'day',
    label: texts.dayLabel,
  },
};

/** Плотный день: шесть выездов подряд, часть внахлёст. */
export const ДеньПлотный: Story = {
  args: {
    columns: dayColumns(
      source({
        orders: [
          morningInstall,
          clashingRepair,
          parallelService,
          { ...morningInstall, id: 'o5', number: 1063, at: '2026-08-23T11:30:00.000Z' },
          { ...parallelService, id: 'o6', number: 1064, at: '2026-08-23T13:00:00.000Z' },
          { ...clashingRepair, id: 'o7', number: 1065, at: '2026-08-23T15:00:00.000Z' },
        ],
      }),
      DAY,
    ),
    view: 'day',
    label: texts.dayLabel,
  },
};

/** Пустой день: сетка часов на месте, записей нет. */
export const ДеньПустой: Story = {
  args: {
    columns: dayColumns(source({ events: [], orders: [], leads: [] }), DAY),
    view: 'day',
    label: texts.dayLabel,
  },
};

/** 🔴 Пересечение: два наряда Дмитрия внахлёст — предупреждение, а не запрет. */
export const Пересечение: Story = {
  args: {
    columns: dayColumns(source({ orders: [morningInstall, clashingRepair] }), DAY),
    view: 'day',
    label: texts.dayLabel,
  },
};

/**
 * 🔴 Наложение занятости команды (ADR-123): выезды и отлучки всех людей на
 * одной сетке, каждый своей краской, рядом с краской — инициалы.
 */
export const ЗанятостьКоманды: Story = {
  args: {
    columns: dayColumns(
      source({
        team: installers,
        blocks: [{ ...doctorBlock, userId: 'u2', day: DAY }],
      }),
      DAY,
    ),
    view: 'day',
    label: texts.dayLabel,
    team: [...marksOf(installers).values()],
  },
};

/** Неделя с наложением: видно, кто и когда занят на всю неделю разом. */
export const ЗанятостьКомандыЗаНеделю: Story = {
  args: {
    columns: weekColumns(source({ team: installers, blocks: monthBlocks }), DAY),
    team: [...marksOf(installers).values()],
  },
};

/** У человека закрыт весь день: полоса не закрашивает колонку, а идёт меткой. */
export const ЗакрытыйДеньВНаложении: Story = {
  args: {
    columns: dayColumns(
      source({
        team: installers,
        blocks: [{ ...wholeDayBlock, userId: 'u3', day: DAY }],
      }),
      DAY,
    ),
    view: 'day',
    label: texts.dayLabel,
    team: [...marksOf(installers).values()],
  },
};
