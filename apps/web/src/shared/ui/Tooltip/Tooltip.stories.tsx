import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { Tooltip } from './Tooltip';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton/IconButton';

const meta = {
  title: 'UI Kit/Tooltip',
  component: Tooltip,
  args: {
    text: 'Обзор — заказы, выручка и выплаты за период',
    children: <IconButton label="Обзор" icon={<Icon name="overview" />} />,
  },
  parameters: { layout: 'centered' },
  argTypes: { placement: { control: 'inline-radio', options: ['top', 'bottom', 'right', 'left'] } },
  decorators: [
    (Story) => (
      <div
        data-ui="panel"
        style={{
          background: 'var(--bg-soft)',
          padding: 60,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Закрыта' };

/** Открытая подсказка — состояние, ради которого компонент и существует. */
export const Open: Story = {
  name: 'Открыта наведением',
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: 'Обзор' }));
  },
};

/**
 * 🔴 WCAG 1.4.13: подсказка, появившаяся по указателю, обязана появляться и с
 * клавиатуры. Здесь она открыта фокусом, а не наведением.
 */
export const OpenByKeyboard: Story = {
  name: 'Открыта фокусом',
  play: async () => {
    await userEvent.tab();
  },
};

export const Placements: Story = {
  name: 'Стороны',
  render: (args) => (
    <div style={{ display: 'grid', gap: 60, gridTemplateColumns: 'repeat(2, auto)' }}>
      {(['top', 'bottom', 'right', 'left'] as const).map((placement) => (
        <Tooltip {...args} key={placement} placement={placement} text={`Подсказка ${placement}`}>
          <IconButton label={placement} icon={<Icon name="pulse" />} />
        </Tooltip>
      ))}
    </div>
  ),
};

/** Длинный текст переносится и не растягивает пузырёк на всю ширину карточки. */
export const LongText: Story = {
  name: 'Длинный текст',
  args: {
    text:
      'Показывает заказы, выручку и выплаты монтажникам за выбранный период. ' +
      'Период меняется в шапке раздела.',
  },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: 'Обзор' }));
  },
};
