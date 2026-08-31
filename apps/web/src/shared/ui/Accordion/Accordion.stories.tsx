import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Accordion } from './Accordion';

const faq = [
  {
    id: 'srok',
    title: 'Сколько занимает установка?',
    content: 'Стандартный монтаж сплит-системы — один день, обычно 3–4 часа.',
  },
  {
    id: 'garantiya',
    title: 'Какая гарантия на монтаж?',
    content: 'Гарантия на работы и на оборудование считается отдельно, срок указан в договоре.',
  },
  {
    id: 'zima',
    title: 'Можно ли ставить кондиционер зимой?',
    content: 'Можно: монтаж выполняется в любой сезон, тест запуска проводится по погоде.',
  },
];

const meta = {
  title: 'UI Kit/Accordion',
  component: Accordion,
  args: { items: faq },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const DefaultOpen: Story = {
  name: 'Первый раздел раскрыт',
  args: { defaultOpen: ['srok'] },
};

export const Multiple: Story = {
  name: 'Несколько раскрытых',
  args: { mode: 'multiple', defaultOpen: ['srok', 'zima'] },
};

export const HeadingLevel: Story = {
  name: 'Уровень заголовка h2',
  args: { headingLevel: 2 },
};

export const Empty: Story = { name: 'Пустой список', args: { items: [] } };

export const Toggling: Story = {
  name: 'Раскрытие с клавиатуры',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /Сколько занимает установка/ });
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  },
};

/**
 * Тот же аккордеон в панели (issue #330). Пункт становится ровно `--h-nav`
 * высотой, шеврон поворачивается на 180° и всё время указывает туда, куда
 * пункт откроется. Содержимое остаётся в HTML и свёрнутым — это инвариант,
 * а не оформление.
 */
export const InPanel: Story = {
  name: 'В панели',
  render: (args) => (
    <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
      <Accordion {...args} />
    </div>
  ),
};

/** Открытый пункт в панели: шеврон развёрнут, содержимое раскрыто. */
export const InPanelOpen: Story = {
  name: 'В панели — открыт',
  args: { defaultOpen: ['srok'] },
  render: (args) => (
    <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
      <Accordion {...args} />
    </div>
  ),
};
