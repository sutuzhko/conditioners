import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { WorkTypeMark, WorkTypeTone } from '@/shared/lib/work-type';
import { WORK_TYPE_TONES } from '@/shared/lib/work-type';

import { WorkTypeBadge } from './WorkTypeBadge';

const install: WorkTypeMark = {
  id: 'wt_install',
  code: 'install',
  title: 'Монтаж',
  icon: 'wrench',
  tone: 'ok',
  dayLong: false,
};

const meta = {
  title: 'Админка/Вид работ',
  component: WorkTypeBadge,
  parameters: { layout: 'centered' },
  args: { workType: install },
} satisfies Meta<typeof WorkTypeBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовый: Story = {};

/** Вся палитра справочника: из неё владелец выбирает краску вида работ. */
export const Палитра: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 420 }}>
      {WORK_TYPE_TONES.map((tone: WorkTypeTone) => (
        <WorkTypeBadge key={tone} workType={{ ...install, title: tone, tone }} />
      ))}
    </div>
  ),
};

/**
 * Длинное название владельца: ярлык переносится, а не выносит колонку за край
 * (ADR-126).
 */
export const ДлинноеНазвание: Story = {
  args: {
    workType: { ...install, title: 'Обслуживание мультисплит-системы на четыре блока' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 200 }}>
        <Story />
      </div>
    ),
  ],
};
