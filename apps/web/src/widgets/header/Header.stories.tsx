import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Header } from './Header';
import {
  companyEmpty,
  companyFixture,
  companyPlaceholder,
  contactsEmpty,
  contactsFixture,
  contactsPlaceholder,
  navFixture,
} from './fixtures';

/** Полоса контента под шапкой: без неё не видно ни стекла, ни залипания. */
function Page() {
  return (
    <div
      style={{
        height: '160vh',
        background: 'var(--hero-grad)',
        padding: '32px 24px',
        color: 'var(--muted)',
      }}
    >
      Прокрутите страницу — шапка залипает сверху и остаётся полупрозрачной.
    </div>
  );
}

const meta = {
  title: 'Блоки/Шапка',
  component: Header,
  parameters: { layout: 'fullscreen' },
  args: { company: companyFixture, contacts: contactsFixture, nav: navFixture },
  render: (args) => (
    <>
      <Header {...args} />
      <Page />
    </>
  ),
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = { name: 'Десктоп 1200 — полная навигация и замок' };

export const Tablet: Story = {
  name: 'Планшет 768 — телефон, заявка и бургер',
  globals: { viewport: { value: 'md' } },
};

export const Phone: Story = {
  name: 'Телефон 375 — бренд и кнопка меню',
  globals: { viewport: { value: 'sm' } },
};

export const Narrow: Story = {
  name: 'Минимум 320 — название не обрезано',
  globals: { viewport: { value: 'xs' } },
};

/** Самое длинное название, какое владелец может завести из админки. */
export const LongName: Story = {
  name: 'Длинное название на 320',
  globals: { viewport: { value: 'xs' } },
  args: { company: { ...companyFixture, name: 'ТулаКлимат Сервис Групп' } },
};

export const Placeholders: Story = {
  name: 'Данные компании ещё заглушки',
  args: { company: companyPlaceholder, contacts: contactsPlaceholder },
};

export const WithoutContacts: Story = {
  name: 'Настройки пустые',
  args: { company: companyEmpty, contacts: contactsEmpty },
};

export const WithoutNav: Story = {
  name: 'Навигация не задана',
  args: { nav: [] },
};

export const MenuOpen: Story = {
  name: 'Меню на телефоне — действия в подвале',
  globals: { viewport: { value: 'sm' } },
  /* 🔴 Снимается только на телефонных ширинах (ADR-219). Выше порога 900
     бургера нет вовсе, сценарий там падал, а снимок повторял «Базовое
     состояние» на той же ширине. */
  tags: ['vr-320', 'vr-375'],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Открыть меню' }));
    const dialog = await within(document.body).findByRole('dialog');

    /* 🔴 `waitFor`, а не голый `expect` (issue #436): меню попадает в разметку
       раньше, чем становится видимым, и проверка без повтора падала — молча. */
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(within(dialog).getByRole('link', { name: 'Монтаж' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(within(dialog).getByRole('link', { name: 'Оставить заявку' })).toBeVisible();
  },
};

/** С 600px телефон и заявка уже видны в шапке — в подвале шторки их нет. */
export const MenuOpenTablet: Story = {
  name: 'Меню на планшете — в подвале только часы и тема',
  globals: { viewport: { value: 'md' } },
  /* Планшетная раскладка подвала меню проверяется на своей ширине: на
     телефоне в подвале лежит ещё и «Оставить заявку», и проверка
     «её там нет» была бы неверной (ADR-219). */
  tags: ['vr-768'],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Открыть меню' }));
    const dialog = await within(document.body).findByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByRole('radiogroup', { name: 'Тема' })).toBeVisible(),
    );
    /* 🔴 `queryByRole` и `toBeNull`, а не `getByRole(...).not.toBeVisible()`
       (issue #436): на планшете ссылки в подвале меню нет вовсе, и `getByRole`
       падал раньше проверки — молча. Отсутствие проверяют запросом, который
       умеет ничего не найти. */
    expect(within(dialog).queryByRole('link', { name: 'Оставить заявку' })).toBeNull();
  },
};
