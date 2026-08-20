import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StepsTimeline } from './StepsTimeline';
import { emptyWarranty, fullWarranty, installationOnlyWarranty } from './fixtures';

/**
 * Этапы монтажа и таймлайн дня. 🔴 Из базы блок не читает ничего: шаги и
 * таймлайн — статический контент, сроки гарантии приходят пропсом из настроек
 * компании (docs/ORCHESTRATION.md, волна 3; инвариант 8).
 */
const meta = {
  title: 'Блоки/Монтаж — этапы',
  component: StepsTimeline,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof StepsTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'Этапы и таймлайн',
  args: { warranty: fullWarranty },
};

export const InstallationOnly: Story = {
  name: 'Заполнена только гарантия на монтаж',
  args: { warranty: installationOnlyWarranty },
};

export const WithoutWarranty: Story = {
  name: 'Гарантия не заведена',
  args: { warranty: emptyWarranty },
};

export const Narrow: Story = {
  name: 'Телефон 320px',
  args: { warranty: fullWarranty },
  globals: { viewport: { value: 'xs' } },
};
