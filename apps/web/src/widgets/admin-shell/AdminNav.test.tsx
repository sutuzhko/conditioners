import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminNav } from './AdminNav';
import { ADMIN_COUNTER_TITLES, adminShellContent as texts, columnSectionsFor } from './content';

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

    /* «Настройки» тоже не в колонке: они живут в меню карточки вошедшего
       (ADR-309), и повтор в колонке стоил ей прокрутки на большом экране. */
    expect(screen.queryByRole('link', { name: 'Настройки' })).not.toBeInTheDocument();
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
  it('на странице конфигурации подсвечены «Настройки» в меню', async () => {
    pathname.mockReturnValue('/admin/company');
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    await userEvent.click(screen.getByRole('button', { expanded: false }));

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
  /* 🔴 Прибитого низа больше нет: те же четыре пункта живут в меню карточки
     вошедшего, и до открытия меню их нет в разметке вовсе. */
  it('меню карточки — отдельная навигация со своим именем', async () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    expect(screen.queryByRole('link', { name: 'Профиль' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { expanded: false }));
    const menu = screen.getByRole('navigation', { name: texts.accountMenuLabel });

    expect(within(menu).getByRole('link', { name: 'Настройки' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Профиль' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: texts.logout })).toBeInTheDocument();
  });

  /* 🔴 «Открыть сайт» приехало сюда из убранной верхней полосы (ADR-309). В
     макете ссылки нет нигде, и без проверки следующая сверка с макетом
     честно убрала бы её как лишнюю. */
  it('«Открыть сайт» стоит в меню карточки и открывается новой вкладкой', async () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    await userEvent.click(screen.getByRole('button', { expanded: false }));
    const menu = screen.getByRole('navigation', { name: texts.accountMenuLabel });
    const site = within(menu).getByRole('link', { name: texts.site });

    expect(site).toHaveAttribute('href', '/');
    expect(site).toHaveAttribute('target', '_blank');
  });

  it('монтажник видит только свои разделы: ни каталога, ни заявок', async () => {
    pathname.mockReturnValue('/admin/crm');
    render(<AdminNav role="installer" userName="Пётр Кузнецов" />);

    expect(screen.getByRole('link', { name: 'Календарь работ' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Каталог' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Заявки' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Монтажники' })).not.toBeInTheDocument();
    /* Настройки — раздел владельца: монтажнику его не показывают ни в колонке,
       ни в меню карточки, и сервер развернул бы его с этого адреса
       (sectionAllows). Профиль у монтажника есть, но тоже в меню. */
    await userEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByRole('link', { name: 'Профиль' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Настройки' })).not.toBeInTheDocument();
  });
});

describe('счётчики ожидающего', () => {
  it('число стоит у своего пункта и названо словами', () => {
    render(
      <AdminNav
        role="owner"
        userName="Сергей Демидов"
        counts={{ orders: 7, leads: 3, reviews: 2 }}
      />,
    );

    /* 🔴 Имя ссылки проверяется целиком: голое число озвучивается как
       «Заказы 7» и не отвечает, семь чего. */
    expect(
      screen.getByRole('link', { name: `Заказы 7 ${ADMIN_COUNTER_TITLES.orders}` }),
    ).toHaveAttribute('href', '/admin/orders');
    expect(
      screen.getByRole('link', { name: `Заявки 3 ${ADMIN_COUNTER_TITLES.leads}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: `Отзывы 2 ${ADMIN_COUNTER_TITLES.reviews}` }),
    ).toBeInTheDocument();
  });

  /* Ноль — рабочее состояние, которое владелец смотрит каждое утро: пропав,
     он читался бы как сбой загрузки. */
  it('ноль показывается, а не прячется', () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" counts={{ reviews: 0 }} />);

    expect(
      screen.getByRole('link', { name: `Отзывы 0 ${ADMIN_COUNTER_TITLES.reviews}` }),
    ).toBeInTheDocument();
  });

  it('без счётчиков подпись пункта остаётся прежней', () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" counts={{}} />);

    expect(screen.getByRole('link', { name: 'Заказы' })).toBeInTheDocument();
  });

  /* У разделов, где ждать нечего, пустое место — это ответ, а не пропуск. */
  it('раздел без очереди счётчика не получает', () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" counts={{ orders: 7 }} />);

    expect(screen.getByRole('link', { name: 'Клиенты' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Каталог' })).toBeInTheDocument();
  });
});

describe('карточка вошедшего', () => {
  it('меню закрыто, пока карточку не нажали', () => {
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    expect(screen.getByRole('button', { name: /Сергей Демидов/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(
      screen.queryByRole('navigation', { name: texts.accountMenuLabel }),
    ).not.toBeInTheDocument();
  });

  /* 🔴 В рельсе от карточки остаётся кружок с инициалами, а от прибитого низа
     — три безымянных значка: меню оказывается единственным местом, где
     действия учётной записи названы словами (ADR-309). */
  it('открывает настройки, профиль, сайт и выход словами', async () => {
    const user = userEvent.setup();
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    await user.click(screen.getByRole('button', { name: /Сергей Демидов/ }));

    const menu = screen.getByRole('navigation', { name: texts.accountMenuLabel });

    expect(within(menu).getByRole('link', { name: 'Настройки' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Профиль' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: texts.site })).toHaveAttribute('href', '/');
    expect(within(menu).getByRole('button', { name: texts.logout })).toBeInTheDocument();
  });

  /* Esc закрывает и возвращает фокус на карточку: иначе он остаётся на
     ссылке, которой больше нет в дереве, и уезжает в начало страницы. */
  it('Esc закрывает меню и возвращает фокус на карточку', async () => {
    const user = userEvent.setup();
    render(<AdminNav role="owner" userName="Сергей Демидов" />);

    const card = screen.getByRole('button', { name: /Сергей Демидов/ });
    await user.click(card);
    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('navigation', { name: texts.accountMenuLabel }),
    ).not.toBeInTheDocument();
    expect(card).toHaveFocus();
  });

  it('монтажнику меню не показывает чужих разделов', async () => {
    const user = userEvent.setup();
    render(<AdminNav role="installer" userName="Пётр Кузнецов" />);

    await user.click(screen.getByRole('button', { name: /Пётр Кузнецов/ }));

    const menu = screen.getByRole('navigation', { name: texts.accountMenuLabel });

    expect(within(menu).getByRole('link', { name: 'Профиль' })).toBeInTheDocument();
    expect(within(menu).queryByRole('link', { name: 'Настройки' })).not.toBeInTheDocument();
  });
});
