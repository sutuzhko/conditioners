import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminSummary } from './AdminSummary';
import {
  busyCounts,
  emptyCounts,
  overdueItems,
  quietCounts,
  readyReadiness,
  unfinishedReadiness,
  upcomingItems,
} from './fixtures';
import { adminSummaryContent as texts } from './summary-content';

describe('Сводка панели управления', () => {
  it('незаполненные группы названы по-человечески, а не ключами базы', () => {
    render(<AdminSummary counts={emptyCounts} readiness={unfinishedReadiness} />);

    expect(screen.getByText('Телефон и почта')).toBeInTheDocument();
    expect(screen.getByText('Реквизиты')).toBeInTheDocument();
    expect(screen.queryByText('contacts')).not.toBeInTheDocument();
  });

  it('пока данные не заполнены, ведёт в раздел компании', () => {
    render(<AdminSummary counts={emptyCounts} readiness={unfinishedReadiness} />);

    expect(screen.getByRole('link', { name: texts.readinessCta })).toHaveAttribute(
      'href',
      '/admin/company',
    );
  });

  it('когда всё заполнено, список групп и призыв исчезают', () => {
    render(<AdminSummary counts={quietCounts} readiness={readyReadiness} />);

    expect(screen.getByText(texts.readinessDone)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: texts.readinessCta })).not.toBeInTheDocument();
  });

  it('готовность стоит последней при любом состоянии настроек', () => {
    /* 🔴 Позиция карточки не зависит от данных (ADR-241): скелетон их не
       знает, и переезд карточки наверх двигал бы плитки вниз сразу после
       загрузки — ровно тот прыжок, против которого написан issue #334.
       О незаполненных настройках говорит вид карточки, а не её место. */
    /* Проверяется порядок блоков между собой, а не номер в списке: сверху
       стоит ещё и заголовок страницы, и привязка к индексу ломалась бы от
       любой правки шапки, ничего не говоря о самом требовании. */
    const orderOf = (container: HTMLElement): { readiness: number; tiles: number } => {
      const blocks = [...container.querySelectorAll('[class*="summary"] > *')];
      return {
        readiness: blocks.findIndex((el) => el.textContent?.includes(texts.readinessTitle)),
        tiles: blocks.findIndex((el) => el.textContent?.includes(texts.leads)),
      };
    };

    const blocking = render(<AdminSummary counts={emptyCounts} readiness={unfinishedReadiness} />);
    const unfinished = orderOf(blocking.container);
    expect(unfinished.readiness).toBeGreaterThan(unfinished.tiles);

    blocking.unmount();

    const done = render(<AdminSummary counts={quietCounts} readiness={readyReadiness} />);
    const ready = orderOf(done.container);
    expect(ready.readiness).toBeGreaterThan(ready.tiles);
    expect(ready.readiness).toBe(unfinished.readiness);
  });

  /* 🔴 Вход в панель был единственной страницей без `h1`: заголовки плиток —
     второй уровень, и читалка объявляла экран безымянным (инвариант 4). */
  it('у сводки есть единственный заголовок первого уровня', () => {
    render(<AdminSummary counts={quietCounts} readiness={readyReadiness} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(texts.title);
  });

  it('плитки — про работу компании, а не про содержимое сайта', () => {
    render(<AdminSummary counts={busyCounts} readiness={readyReadiness} />);

    const tiles: readonly (readonly [string, string, number])[] = [
      [texts.leads, '/admin/leads', busyCounts.newLeads],
      [texts.orders, '/admin/orders', busyCounts.activeOrders],
      [texts.clients, '/admin/clients', busyCounts.clients],
      [texts.installers, '/admin/team', busyCounts.installers],
      [texts.reviews, '/admin/reviews', busyCounts.pendingReviews],
    ];

    for (const [title, href, value] of tiles) {
      const tile = screen.getByRole('link', { name: new RegExp(title) });
      expect(tile).toHaveAttribute('href', href);
      expect(within(tile).getByText(String(value))).toBeInTheDocument();
    }
  });

  it('плиток про каталог и статьи на сводке больше нет', () => {
    render(<AdminSummary counts={busyCounts} readiness={readyReadiness} />);

    expect(screen.queryByRole('link', { name: /каталоге/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Статей/ })).not.toBeInTheDocument();
  });

  it('ноль обращений не выделяется — выделение значит «нужно действие»', () => {
    const { container } = render(<AdminSummary counts={emptyCounts} readiness={readyReadiness} />);

    expect(container.querySelectorAll('[class*="urgent"]')).toHaveLength(0);
  });

  it('ожидающие обращения и отзывы выделены, а число заказов — нет', () => {
    const { container } = render(<AdminSummary counts={busyCounts} readiness={readyReadiness} />);

    /* Семь заказов в работе — это норма сезона, а не повод для тревоги:
       подсвеченным должно быть только то, что ждёт ответа человека. */
    expect(container.querySelectorAll('[class*="urgent"]')).toHaveLength(2);
  });

  it('показывает ближайшие дела: за ними в панель и заходят', () => {
    render(
      <AdminSummary counts={quietCounts} readiness={readyReadiness} upcoming={upcomingItems} />,
    );

    expect(screen.getByText('сегодня 18:00')).toBeInTheDocument();
    expect(screen.getByText('Замер')).toBeInTheDocument();
    expect(screen.getByText('Ирина Соколова')).toBeInTheDocument();
  });

  it('наряд и дело в одном списке различимы словом, а не только цветом', () => {
    render(
      <AdminSummary counts={quietCounts} readiness={readyReadiness} upcoming={upcomingItems} />,
    );

    /* ADR-093: наряд — работа с деньгами, дело — напоминание. Списка, в
       котором одно неотличимо от другого, быть не должно. */
    expect(screen.getAllByText(texts.natureTitle('order'))).toHaveLength(2);
    expect(screen.getAllByText(texts.natureTitle('event'))).toHaveLength(2);
  });

  it('каждая строка ведёт в свою сущность: наряд — в карточку, дело — в календарь', () => {
    render(
      <AdminSummary counts={quietCounts} readiness={readyReadiness} upcoming={upcomingItems} />,
    );

    expect(screen.getByRole('link', { name: /Ирина Соколова/ })).toHaveAttribute(
      'href',
      '/admin/orders/o1',
    );
    expect(screen.getByRole('link', { name: /Сергей/ })).toHaveAttribute('href', '/admin/crm');
  });

  it('просроченное дело помечено словом, а не одним цветом', () => {
    render(
      <AdminSummary counts={quietCounts} readiness={readyReadiness} upcoming={overdueItems} />,
    );

    expect(screen.getByText(texts.upcomingOverdue)).toBeInTheDocument();
  });

  it('пустой список объясняет пустоту, а не молчит', () => {
    render(<AdminSummary counts={quietCounts} readiness={readyReadiness} />);

    expect(screen.getByText(texts.upcomingEmpty)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: texts.upcomingCta })).toHaveAttribute(
      'href',
      '/admin/crm',
    );
  });
});
