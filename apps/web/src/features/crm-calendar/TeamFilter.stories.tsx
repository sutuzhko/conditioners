import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { dmitry, installers, monthOrders } from './fixtures';
import type { CalendarPlace } from './navigation';
import { marksOf, teamLoad } from './schedule';
import { TeamFilter } from './TeamFilter';

const legend = [...marksOf(installers).values()];
const load = teamLoad(monthOrders, installers);

function place(over: Partial<CalendarPlace> = {}): CalendarPlace {
  return {
    view: 'week',
    day: '2026-08-23',
    month: '2026-08',
    today: '2026-08-23',
    team: true,
    who: null,
    kinds: null,
    ...over,
  };
}

const meta = {
  title: 'Админка/Календарь/Карточка «Показывать»',
  component: TeamFilter,
  parameters: { layout: 'padded' },
  args: { place: place(), team: legend, load },
} satisfies Meta<typeof TeamFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 🔴 Список имён — он же легенда: цвет человека тот же, что у его записей. */
export const ВсеВидны: Story = {};

/** Человек выключен: галочка пустеет, строка гаснет, часы остаются на месте. */
export const ЧеловекСкрыт: Story = {
  args: { place: place({ who: [dmitry.id] }) },
};

/** 🔴 Слой выключен целиком: галочек нет ни у кого, виды записей остаются. */
export const СлойВыключен: Story = {
  args: { place: place({ team: false }) },
};

/** Виды записей: с сетки сняты заявки и дела — остались одни наряды. */
export const ТолькоНаряды: Story = {
  args: { place: place({ kinds: ['orders'] }) },
};

/** Команды ещё нет: остаются виды записей и подвал с рабочим окном. */
export const БезКоманды: Story = {
  args: { team: [], load: undefined },
};
