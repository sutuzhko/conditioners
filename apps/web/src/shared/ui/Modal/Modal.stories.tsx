import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
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
          <Button variant="bordered">Отмена</Button>
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

    /* 🔴 `waitFor`, а не голый `expect` (issue #435). Окно появляется в
       разметке раньше, чем становится видимым, и проверка без повтора падала
       на открытии — молча: исключение сценария не красит ни один прогон. */
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.keyboard('{Escape}');

    /* Сценарий кончается проверкой: до сих пор нажатие Escape было, а
       проверки, что окно от него закрылось, не было ни одной. */
    await waitFor(() => expect(dialog).not.toBeVisible());
  },
};

/**
 * Окно панели (issue #330): радиус `--r-card`, тень `--sh-lg`, шапка и подвал
 * теми же поясами, что у карточки.
 *
 * 🔴 Панельные переменные доезжают до окна через `body:has([data-ui='panel'])`
 * (ADR-193): `Portal` рендерит в `document.body`, то есть мимо контейнера
 * панели, и без второго селектора окно осталось бы на геометрии витрины.
 * Обратная сторона приёма — витрина и панель не встают рядом в одной истории.
 */
export const InPanel: Story = {
  name: 'В панели',
  render: () => (
    <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
      <ModalExample
        title="Отменить наряд № 1059?"
        description="Монтажник получит уведомление"
        footer={
          <>
            <Button variant="bordered">Оставить</Button>
            <Button>Отменить наряд</Button>
          </>
        }
      />
    </div>
  ),
};

/** Открытое окно панели — состояние, ради которого компонент и существует. */
export const InPanelOpen: Story = {
  name: 'В панели — открыто',
  render: function Render() {
    return (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Modal
          open
          onClose={() => {}}
          title="Отменить наряд № 1059?"
          description="Монтажник получит уведомление"
          footer={
            <>
              <Button variant="bordered">Оставить</Button>
              <Button>Отменить наряд</Button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            Наряд уйдёт в отказ, а время в календаре освободится. Клиенту ничего не отправляется.
          </p>
        </Modal>
      </div>
    );
  },
};
