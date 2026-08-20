import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TrustStrip } from './TrustStrip';

/**
 * Полоса доверия. Пропсов у неё нет: в блоке только описание услуги, ни одного
 * факта о компании (инвариант 8).
 */
const meta = {
  title: 'Блоки/Полоса доверия',
  component: TrustStrip,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TrustStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Полоса' };
