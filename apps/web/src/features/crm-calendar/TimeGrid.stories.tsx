import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { crmContent as texts } from './content';
import {
  crowdedOrders,
  dayNote,
  doctorBlock,
  installers,
  lateInstall,
  manyLeads,
  monthBlocks,
  monthEvents,
  monthLeads,
  monthOrders,
  viewerId,
  wholeDayBlock,
} from './fixtures';
import {
  DEFAULT_WORK_WINDOW,
  dayColumns,
  hourRangeOf,
  weekColumns,
  type ScheduleSource,
} from './schedule';
import { TimeGrid } from './TimeGrid';

/** 23 августа 2026, воскресенье — день, на который заведены фикстуры. */
const DAY = '2026-08-23';
const RANGE = hourRangeOf(DEFAULT_WORK_WINDOW);

function source(patch: Partial<ScheduleSource> = {}): ScheduleSource {
  return {
    events: monthEvents,
    orders: monthOrders,
    leads: monthLeads,
    blocks: [],
    viewerId,
    today: DAY,
    ...patch,
  };
}

const meta = {
  title: 'Админка/Календарь/Сетка часов',
  component: TimeGrid,
  parameters: {
    layout: 'padded',
    // Допущения инвариантов — причины в reason (ADR-230)
    invariants: {
      allow: [
        {
          rule: 'occlusion',
          reason:
            'события лежат поверх сетки часов по эталону Apple Calendar (ADR-128, ADR-138, ADR-140); час под событием достижим через событие',
        },
      ],
    },
  },
  args: {
    columns: weekColumns(source(), DAY),
    view: 'week',
    range: RANGE,
    // 14:20 по московскому времени: линия «сейчас» видна в рабочем окне
    nowMin: 14 * 60 + 20,
    label: texts.weekLabel,
  },
} satisfies Meta<typeof TimeGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Неделя колонками дней: наряды, дела и заявки на своих часах. */
export const Неделя: Story = {};

/** Пустая неделя — первые дни после установки панели. */
export const НеделяПустая: Story = {
  args: { columns: weekColumns(source({ events: [], orders: [], leads: [] }), DAY) },
};

/** Занятость в сетке: закрытый целиком день и запись к врачу на два часа. */
export const НеделяСЗанятостью: Story = {
  args: { columns: weekColumns(source({ blocks: monthBlocks }), '2026-08-26') },
};

/** День по часам с линией «сейчас» — вид, в котором планируют выезды. */
export const День: Story = {
  args: { columns: dayColumns(source(), DAY), view: 'day', label: texts.dayLabel },
};

/** Пустой день: сетка часов на месте, записей нет. */
export const ДеньПустой: Story = {
  args: {
    columns: dayColumns(source({ events: [], orders: [], leads: [] }), DAY),
    view: 'day',
    label: texts.dayLabel,
  },
};

/** Одна запись: короткий звонок держит минимальную высоту, но не врёт о начале. */
export const ОднаЗапись: Story = {
  args: {
    columns: dayColumns(
      source({ events: [monthEvents[0] ?? dayNote], orders: [], leads: [] }),
      DAY,
    ),
    view: 'day',
    label: texts.dayLabel,
  },
};

/** 🔴 Пересечение: два наряда Дмитрия внахлёст — предупреждение, а не запрет. */
export const Наложение: Story = {
  args: {
    columns: dayColumns(source({ orders: monthOrders.slice(0, 2), events: [], leads: [] }), DAY),
    view: 'day',
    label: texts.dayLabel,
  },
};

/** 🔴 Пять выездов на одно время: ширины на всех нет — записи идут лесенкой. */
export const Лесенка: Story = {
  args: {
    columns: dayColumns(source({ orders: crowdedOrders, events: [], leads: [] }), DAY),
    view: 'day',
    label: texts.dayLabel,
  },
};

/** 🔴 Переработка: монтаж до десяти вечера при рабочем окне до девятнадцати. */
export const Переработка: Story = {
  args: {
    columns: dayColumns(source({ events: [lateInstall], orders: [], leads: [] }), DAY),
    view: 'day',
    label: texts.dayLabel,
  },
};

/** 🔴 Полоса «весь день» переполнена: восемь заявок сворачиваются в «Ещё N». */
export const ПолосаПереполнена: Story = {
  args: {
    columns: dayColumns(source({ leads: manyLeads, events: [dayNote], orders: [] }), DAY),
    view: 'day',
    label: texts.dayLabel,
  },
};

/**
 * 🔴 Наложение занятости команды (ADR-123): выезды и отлучки всех людей на
 * одной сетке, каждый своей краской, рядом с краской — инициалы.
 */
export const СлойКоманды: Story = {
  args: {
    columns: dayColumns(
      source({ team: installers, blocks: [{ ...doctorBlock, userId: 'u2', day: DAY }] }),
      DAY,
    ),
    view: 'day',
    label: texts.dayLabel,
  },
};

/** Неделя со слоем: видно, кто и когда занят на всю неделю разом. */
export const СлойКомандыЗаНеделю: Story = {
  args: {
    columns: weekColumns(source({ team: installers, blocks: monthBlocks }), DAY),
  },
};

/** У человека закрыт весь день: полоса не закрашивает колонку, а идёт в «весь день». */
export const ЗакрытыйДеньВСлое: Story = {
  args: {
    columns: dayColumns(
      source({ team: installers, blocks: [{ ...wholeDayBlock, userId: 'u3', day: DAY }] }),
      DAY,
    ),
    view: 'day',
    label: texts.dayLabel,
  },
};

/**
 * 🔴 Неделя с наложением: в колонке остаётся одна запись, остаток — за «+N»
 * (issue #47). Колонка недели около 120px, и делить её надвое значит оставить
 * имени тридцать пикселей — от «Фёдоров» видно «Фе…».
 */
export const НеделяСоСвёрткой: Story = {
  args: { columns: weekColumns(source({ orders: crowdedOrders }), DAY) },
};

/** Сегодня: линия текущего времени с кружком — только в колонке этого дня. */
export const Сегодня: Story = {
  args: { columns: weekColumns(source({ today: DAY }), DAY), nowMin: 11 * 60 + 40 },
};
