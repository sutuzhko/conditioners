import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StepsTimeline } from './StepsTimeline';
import { timelineContent } from './content';
import { emptyWarranty, fullWarranty, installationOnlyWarranty } from './fixtures';

/**
 * Этапы монтажа и таймлайн дня. 🔴 Из базы блок не читает ничего: шаги и
 * таймлайн — статический контент, сроки гарантии приходят пропсом из настроек
 * компании (docs/ORCHESTRATION.md, волна 3; инвариант 8).
 *
 * День по часам до 900px свёрнут родным `<details>` (issue #270): базовые
 * истории показывают свёрнутое состояние, `DayOpen` — раскрытое. С 900px
 * переключателя нет — блок раскрыт стилем, и сценарий истории это учитывает.
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

/**
 * Раскрытый день по часам. Сценарий нажимает на строку-переключатель, если
 * она видна: с 900px её нет — содержимое раскрыто стилем, и нажимать нечего.
 */
export const DayOpen: Story = {
  name: 'День по часам раскрыт',
  args: { warranty: fullWarranty },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const details = canvasElement.querySelector('details');
    await expect(details).not.toBeNull();
    const summary = canvas.getByText(timelineContent.kicker, { selector: 'summary *' });
    if (summary.checkVisibility()) {
      await userEvent.click(summary);
      await expect(details).toHaveAttribute('open');
    }
    /* Видимость — геометрией, а не `toBeVisible`: тот считает содержимое
       закрытого `<details>` скрытым, а с 900px оно раскрыто стилем при
       закрытом атрибуте (ADR-237). `checkVisibility` учитывает
       `content-visibility` и отвечает по факту отрисовки. */
    await expect(
      canvas.getByRole('heading', { name: timelineContent.title }).checkVisibility(),
    ).toBe(true);
  },
};
