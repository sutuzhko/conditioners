import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '../Button/Button';
import { Modal } from './Modal';
import type { ModalProps } from './Modal';

/** Окно открывается кнопкой — так его и видит пользователь. */
function ModalExample({
  children = <p style={{ margin: 0 }}>Перезвоним в течение 15 минут в рабочее время.</p>,
  ...props
}: Partial<ModalProps>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Открыть окно</Button>
      <Modal title="Заявка принята" {...props} open={open} onClose={() => setOpen(false)}>
        {children}
      </Modal>
    </>
  );
}

const meta = {
  title: 'UI Kit/Modal',
  component: Modal,
  args: { open: false, onClose: () => {}, title: 'Заявка принята', children: null },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние', render: () => <ModalExample /> };

export const WithDescription: Story = {
  name: 'С пояснением',
  render: () => <ModalExample description="Номер заявки 128 — сохраните его на всякий случай" />,
};

export const WithFooter: Story = {
  name: 'С кнопками внизу',
  render: () => (
    <ModalExample
      title="Удалить модель из каталога?"
      description="Действие нельзя отменить"
      footer={
        <>
          <Button variant="secondary">Отмена</Button>
          <Button>Удалить</Button>
        </>
      }
    />
  ),
};

export const Sizes: Story = {
  name: 'Размеры',
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <ModalExample size="sm" title="Компактное окно" />
      <ModalExample size="lg" title="Широкое окно" />
    </div>
  ),
};

export const LongContent: Story = {
  name: 'Длинное содержимое',
  render: () => (
    <ModalExample title="Как обманывают при установке">
      <div style={{ display: 'grid', gap: 12 }}>
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index} style={{ margin: 0 }}>
            Схема {index + 1}: короткая трасса без вакуумации, зато «дёшево».
          </p>
        ))}
      </div>
    </ModalExample>
  ),
};

export const Opening: Story = {
  name: 'Открытие и закрытие',
  render: () => <ModalExample />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Открыть окно' }));
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};
