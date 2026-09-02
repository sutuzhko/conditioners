import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { HonestPricing } from './HonestPricing';
import { honestyContent } from './content';
import { higherInstallFrom, installFrom } from './fixtures';

/**
 * Разбор двух смет. 🔴 Цена в заголовке приходит из прайса пропсом: истории
 * показывают обе ситуации — цена передана и цены нет. Во второй заголовок
 * обязан остаться без единой цифры, иначе блок начнёт обещать стоимость,
 * которой нет в базе.
 *
 * Список второй сметы до 900px свёрнут родным `<details>` (issue #271):
 * базовые истории показывают свёрнутое состояние, `RivalOpen` — раскрытое.
 * С 900px сметы стоят рядом, переключателя нет — список раскрыт стилем.
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

/**
 * Раскрытый список второй сметы. Сценарий нажимает на строку-переключатель,
 * если она видна: с 900px её нет — список раскрыт стилем, и нажимать нечего.
 */
export const RivalOpen: Story = {
  name: 'Вторая смета раскрыта',
  args: { installFrom },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const details = canvasElement.querySelector('details');
    await expect(details).not.toBeNull();
    const summary = canvas.getByText(honestyContent.rivalToggle, { selector: 'summary *' });
    if (summary.checkVisibility()) {
      await userEvent.click(summary);
      await expect(details).toHaveAttribute('open');
    }
    await expect(canvas.getByRole('list', { name: honestyContent.rivalListLabel })).toBeVisible();
  },
};
