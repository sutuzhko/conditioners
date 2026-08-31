import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { Drawer } from './Drawer';
import type { DrawerProps } from './Drawer';

const navigation = [
  'Каталог',
  'Цены',
  'Установка',
  'Ремонт и обслуживание',
  'Отзывы',
  'База знаний',
  'Контакты',
];

function DrawerExample({ children, ...props }: Partial<DrawerProps>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        label="Открыть меню"
        variant="outline"
        onClick={() => setOpen(true)}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        }
      />
      <Drawer title="Меню" {...props} open={open} onClose={() => setOpen(false)}>
        {children ?? (
          <nav aria-label="Основная навигация">
            <ul style={{ display: 'grid', gap: 4, margin: 0, padding: 0, listStyle: 'none' }}>
              {navigation.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    style={{
                      display: 'block',
                      minHeight: 44,
                      padding: '12px 8px',
                      color: 'var(--ink2)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </Drawer>
    </>
  );
}

const meta = {
  title: 'UI Kit/Drawer',
  component: Drawer,
  args: { open: false, onClose: () => {}, children: null },
  parameters: { viewport: { defaultViewport: 'sm' } },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние', render: () => <DrawerExample /> };

export const FromLeft: Story = { name: 'Слева', render: () => <DrawerExample side="left" /> };

export const WithFooter: Story = {
  name: 'С кнопкой заявки внизу',
  render: () => (
    <DrawerExample
      footer={
        <>
          <Button fullWidth>Оставить заявку</Button>
          <Button variant="bordered" fullWidth>
            Позвонить
          </Button>
        </>
      }
    />
  ),
};

export const WithoutTitle: Story = {
  name: 'Без заголовка',
  render: () => <DrawerExample title={undefined} label="Меню сайта" />,
};

export const Empty: Story = {
  name: 'Пустое меню',
  render: () => (
    <DrawerExample>
      <p style={{ margin: 0, color: 'var(--muted)' }}>Разделы ещё не заданы</p>
    </DrawerExample>
  ),
};

export const Opening: Story = {
  name: 'Открытие и закрытие',
  render: () => <DrawerExample />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Открыть меню' }));
    const dialog = await within(document.body).findByRole('dialog');

    /* 🔴 `waitFor`, а не голый `expect` (issue #435). Панель появляется в
       разметке раньше, чем становится видимой, и проверка без повтора падала
       на открытии — молча: исключение сценария не красит ни один прогон, а
       история после отказа замирала с открытой панелью. Отсюда и брались
       разные снимки на неизменном коде. */
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.click(within(dialog).getByRole('button', { name: 'Закрыть меню' }));

    /* Сценарий кончается проверкой, а не действием: иначе история объявляется
       готовой, пока панель ещё закрывается, и снимок ловит её то с
       затемнением, то без. */
    await waitFor(() => expect(dialog).not.toBeVisible());
  },
};
