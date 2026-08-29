import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatPhone } from '@/shared/lib/format';
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

const setup = (props: Partial<Parameters<typeof Header>[0]> = {}) =>
  render(
    <Header company={companyFixture} contacts={contactsFixture} nav={navFixture} {...props} />,
  );

/* 🔴 Тема готовится до отрисовки и не убирается после: уборка снимала атрибут
   раньше, чем размонтировался шапочный переключатель, и его наблюдатель ставил
   состояние вне `act` — предупреждение на каждый тест файла (issue #237). */
beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  localStorage.clear();
});

describe('Header', () => {
  it('это ориентир banner с навигацией внутри', () => {
    setup();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Основная навигация' })).toBeInTheDocument();
  });

  it('название бренда приходит из настроек, а не зашито', () => {
    setup({ company: companyPlaceholder });
    expect(screen.getAllByText('ЗАПОЛНИТЕ В АДМИНКЕ').length).toBeGreaterThan(0);
  });

  it('телефон — ссылка tel: с форматированным номером', () => {
    setup();
    const link = screen.getByRole('link', { name: /Позвонить/ });
    expect(link).toHaveAttribute('href', 'tel:+74872900000');
    // сравниваем с форматтером, а не с литералом: в номере неразрывные пробелы
    expect(link.textContent).toContain(formatPhone('+74872900000'));
  });

  it('без телефона в настройках ссылки на звонок нет', () => {
    setup({ contacts: contactsEmpty });
    expect(screen.queryByRole('link', { name: /Позвонить/ })).not.toBeInTheDocument();
  });

  it('активный раздел помечен aria-current', () => {
    setup();
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' });
    expect(within(nav).getByRole('link', { name: 'Монтаж' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Каталог' })).not.toHaveAttribute('aria-current');
  });

  it('логотип ведёт на главную и получает имя, даже когда название пустое', () => {
    setup({ company: companyEmpty });
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
  });

  it('меню открывается бургером и закрывается кнопкой', async () => {
    const user = userEvent.setup();
    setup();

    const burger = screen.getByRole('button', { name: 'Открыть меню' });
    expect(burger).toHaveAttribute('aria-expanded', 'false');

    await user.click(burger);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: 'Каталог' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Закрыть меню' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('меню закрывается по Escape', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('меню открывается с клавиатуры', async () => {
    const user = userEvent.setup();
    setup();

    screen.getByRole('button', { name: 'Открыть меню' }).focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('переключатель темы меняет тему на html и запоминает выбор', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Переключить тему' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('tk-theme')).toBe('dark');
  });

  it('без пунктов навигации нет ни списка, ни бургера', () => {
    setup({ nav: [] });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Открыть меню' })).not.toBeInTheDocument();
  });

  it('кнопка заявки ведёт на форму', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Оставить заявку' })).toHaveAttribute('href', '#lead');
  });

  it('заглушка телефона не ломает шапку', () => {
    setup({ company: companyPlaceholder, contacts: contactsPlaceholder });
    expect(screen.getByRole('link', { name: /Позвонить/ })).toBeInTheDocument();
  });
});
