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
  it('🔴 заголовок экрана ровно один и он первого уровня (инвариант 4)', () => {
    render(<AdminSummary counts={busyCounts} readiness={readyReadiness} upcoming={upcomingItems} />);

    /* Проверяется не наличие текста, а уровень и число: `h1` был пропущен
       вовсе, и дерево заголовков начиналось со второго уровня — заголовков
       карточек. Пересчёт ловит и обратную ошибку, когда карточка однажды
       поднимется до первого уровня «чтобы выглядело крупнее». */
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(texts.title);
  });

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

  it('незаполненная готовность стоит выше плиток, заполненная — ниже', () => {
    /* Сайт с заглушками публиковать нельзя, и напоминание об этом обязано
       быть первым. Зелёная галочка, наоборот, не вправе каждый день
       отодвигать вниз работу. */
    /* Порядок меряется относительно плиток, а не по номеру ребёнка: первым в
       колонке стоит заголовок экрана, и «готовность выше плиток» — это про
       плитки, а не про то, что выше неё нет вообще ничего. */
    const orderOf = (container: HTMLElement): { readiness: number; tiles: number } => {
      const children = [...container.querySelectorAll('[class*="summary"] > *')];
      return {
        readiness: children.findIndex(
          (node) => node.textContent?.includes(texts.readinessTitle) === true,
        ),
        tiles: children.findIndex((node) => node.className.includes('tiles')),
      };
    };

    const blocking = render(<AdminSummary counts={emptyCounts} readiness={unfinishedReadiness} />);
    const blockingOrder = orderOf(blocking.container);
    expect(blockingOrder.readiness).toBeGreaterThanOrEqual(0);
    expect(blockingOrder.readiness).toBeLessThan(blockingOrder.tiles);

    blocking.unmount();

    const done = render(<AdminSummary counts={quietCounts} readiness={readyReadiness} />);
    const doneOrder = orderOf(done.container);
    expect(doneOrder.readiness).toBeGreaterThan(doneOrder.tiles);

    // и заполненная готовность по-прежнему замыкает колонку
    const children = done.container.querySelectorAll('[class*="summary"] > *');
    expect(children[children.length - 1]?.textContent).toContain(texts.readinessTitle);
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
