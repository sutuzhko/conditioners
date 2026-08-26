import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { OrderUnits } from './OrderUnits';
import { unitDrafts } from './fixtures';
import type { OrderUnitDraft } from './model';

/** Живой редактор: в истории позиции действительно добавляются и удаляются. */
function LiveUnits({ initial }: { readonly initial: readonly OrderUnitDraft[] }) {
  const [units, setUnits] = useState<readonly OrderUnitDraft[]>(initial);
  return <OrderUnits units={units} onChange={setUnits} />;
}

const meta = {
  title: 'Админка/Заказы/Позиции оборудования',
  component: OrderUnits,
  args: { units: unitDrafts, onChange: () => undefined },
} satisfies Meta<typeof OrderUnits>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 🔴 Две позиции с разными условиями: наше оборудование и блок клиента. */
export const Базовое: Story = {};

export const Пусто: Story = {
  args: { units: [] },
};

/** Форма отправляется: правка позиций закрыта вместе с остальными полями. */
export const Отключено: Story = {
  args: { disabled: true },
};

export const Правка: Story = {
  render: () => <LiveUnits initial={unitDrafts} />,
};

export const ПравкаСНуля: Story = {
  render: () => <LiveUnits initial={[]} />,
};
