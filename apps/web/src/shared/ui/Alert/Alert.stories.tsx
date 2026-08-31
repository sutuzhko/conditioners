import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Alert } from './Alert';
import { Button } from '../Button/Button';

const meta = {
  title: 'UI Kit/Alert',
  component: Alert,
  args: { title: 'Роль изменена', children: 'Монтажник больше не видит цены закупки.' },
  parameters: { layout: 'padded' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['info', 'success', 'warning', 'danger'] },
  },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Tones: Story = {
  name: 'Все краски',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Alert {...args} tone="info" title="Заявка в очереди">
        Уведомление уйдёт, когда воркер разберёт очередь.
      </Alert>
      <Alert {...args} tone="success" title="Наряд закрыт">
        Монтажник отметил работу выполненной.
      </Alert>
      <Alert {...args} tone="warning" title="Материал на исходе">
        Медной трубы осталось на два выезда.
      </Alert>
      <Alert {...args} tone="danger" title="Данные не загрузились">
        База не ответила за десять секунд.
      </Alert>
    </div>
  ),
};

/** Блочное состояние ошибки: объяснение плюс действие «Повторить». */
export const WithAction: Story = {
  name: 'С действием',
  args: {
    tone: 'danger',
    title: 'Данные не загрузились',
    children: 'База не ответила за десять секунд. Остальные разделы работают.',
    action: <Button size="sm">Повторить</Button>,
  },
};

/** Только заголовок: коротким сообщениям пояснение не нужно. */
export const TitleOnly: Story = {
  name: 'Только заголовок',
  args: { tone: 'success', title: 'Изменения сохранены', children: undefined },
};

export const LongText: Story = {
  name: 'Длинный текст',
  args: {
    tone: 'warning',
    title: 'Монтажник не увидит этот наряд',
    children:
      'У него роль «монтажник», а наряд заведён без назначения. Назначьте исполнителя, ' +
      'иначе наряд останется висеть в общем списке и не попадёт ни в чей календарь.',
    action: <Button size="sm">Назначить</Button>,
  },
};
