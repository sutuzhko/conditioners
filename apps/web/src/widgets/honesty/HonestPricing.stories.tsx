import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { HonestPricing } from './HonestPricing';
import { higherInstallFrom, installFrom } from './fixtures';

/**
 * Разбор двух смет. 🔴 Цена в заголовке приходит из прайса пропсом: истории
 * показывают обе ситуации — цена передана и цены нет. Во второй заголовок
 * обязан остаться без единой цифры, иначе блок начнёт обещать стоимость,
 * которой нет в базе.
 */
const meta = {
  title: 'Блоки/Честность — почему монтаж стоит столько',
  component: HonestPricing,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HonestPricing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPrice: Story = {
  name: 'Цена монтажа передана',
  args: { installFrom },
};

export const OtherPrice: Story = {
  name: 'Цену подняли в админке — заголовок поехал следом',
  args: { installFrom: higherInstallFrom },
};

export const WithoutPrice: Story = {
  name: 'Прайс не заведён — заголовок без цифры',
  args: {},
};

export const NullPrice: Story = {
  name: 'Страница передала null — ведёт себя как «цены нет»',
  args: { installFrom: null },
};
