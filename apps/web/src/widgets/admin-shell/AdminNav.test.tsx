import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminNav } from './AdminNav';
import { adminShellContent as texts, columnSectionsFor } from './content';

const pathname = vi.fn(() => '/admin/catalog');

/* Кнопка выхода живёт в прибитом низу колонки и зовёт роутер — без него
   колонка не отрисуется вовсе. */
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  pathname.mockReturnValue('/admin/catalog');
});

describe('Навигация панели', () => {
  it('показывает разделы колонки', () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    for (const section of columnSectionsFor('owner')) {
      expect(screen.getByRole('link', { name: section.title })).toHaveAttribute(
        'href',
        section.href,
      );
    }
  });

  /* 🔴 Конфигурация уехала под «Настройки» (ADR-188): в колонке её нет, но
     адреса остались прежними — они разосланы в письмах и стоят в закладках. */
  it('разделы конфигурации в колонке не стоят', () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    expect(screen.queryByRole('link', { name: 'Компания' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Цены на монтаж' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Уведомления' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Настройки' })).toHaveAttribute(
      'href',
      '/admin/settings',
    );
  });

  it('подсвечивает открытый раздел', () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    expect(screen.getByRole('link', { name: 'Каталог' })).toHaveAttribute('aria-current', 'page');
  });

  it('на вложенной странице подсвечен её раздел, а не пусто', () => {
    pathname.mockReturnValue('/admin/catalog/42');
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    expect(screen.getByRole('link', { name: 'Каталог' })).toHaveAttribute('aria-current', 'page');
  });

  /* Внутри раздела настроек подсветка не пропадает: горит пункт, через
     который в него заходят. */
  it('на странице конфигурации подсвечены «Настройки»', () => {
    pathname.mockReturnValue('/admin/company');
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    expect(screen.getByRole('link', { name: 'Настройки' })).toHaveAttribute('aria-current', 'page');
  });

  it('раздел с похожим началом адреса чужую подсветку не забирает', () => {
    pathname.mockReturnValue('/admin/crm');
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    expect(screen.getByRole('link', { name: 'Каталог' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Календарь работ' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  /* 🔴 «Обзор» стоит первым в списке, и его адрес — начало каждого адреса
     панели. Подсветка «по началу адреса» горела бы на нём всегда. */
  it('«Обзор» не подсвечивается на чужих разделах', () => {
    pathname.mockReturnValue('/admin/stock');
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    expect(screen.getByRole('link', { name: 'Обзор' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Склад' })).toHaveAttribute('aria-current', 'page');
  });

  it('карточка сверху называет, кто вошёл и в какой роли', () => {
    render(<AdminNav role="installer" userName="Пётр Кузнецов" />);

    expect(screen.getByText('Пётр Кузнецов')).toBeInTheDocument();
    expect(screen.getByText('Монтажник')).toBeInTheDocument();
  });

  /* Две навигации на странице читалка различает только по имени: без него
     обе объявляются одинаково, и вторая выглядит повтором первой. */
  it('прибитый низ — отдельная навигация со своим именем', () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    const foot = screen.getByRole('navigation', { name: texts.accountLabel });

    expect(within(foot).getByRole('link', { name: 'Настройки' })).toBeInTheDocument();
    expect(within(foot).getByRole('link', { name: 'Профиль' })).toBeInTheDocument();
    expect(within(foot).getByRole('button', { name: texts.logout })).toBeInTheDocument();
  });

  it('страницу не прокручивает: лента разделов двигается сама, а не тянет за собой экран', () => {
    const scrolled = vi.spyOn(window, 'scrollTo');
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    expect(scrolled).not.toHaveBeenCalled();
    // в jsdom лента не прокручивается (нулевые размеры) — и трогать её нечем
    const sections = screen.getByRole('navigation', { name: texts.navLabel });
    expect(sections.parentElement?.scrollLeft).toBe(0);
  });

  it('монтажник видит только свои разделы: ни каталога, ни заявок', () => {
    pathname.mockReturnValue('/admin/crm');
    render(<AdminNav role="installer" userName="Пётр Кузнецов" />);

    expect(screen.getByRole('link', { name: 'Календарь работ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Профиль' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Каталог' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Заявки' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Монтажники' })).not.toBeInTheDocument();
    /* Настройки — раздел владельца: монтажнику его не показывают, и сервер
       развернул бы его с этого адреса (sectionAllows). */
    expect(screen.queryByRole('link', { name: 'Настройки' })).not.toBeInTheDocument();
  });
});
