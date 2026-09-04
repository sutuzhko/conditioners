import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminSummary, type SummaryData } from './AdminSummary';
import {
  attentionItems,
  busyCounts,
  emptyCounts,
  emptyMoney,
  moneySummary,
  overdueItems,
  quietCounts,
  readyReadiness,
  summaryPeriod,
  unfinishedReadiness,
  upcomingItems,
  workCounts,
} from './fixtures';
import { adminSummaryContent as texts } from './summary-content';

/** Сегмент «Обзор» с заданными числами: три четверти тестов начинаются с него. */
function overview(
  counts = quietCounts,
  readiness = readyReadiness,
  upcoming = upcomingItems,
): SummaryData {
  return { segment: 'overview', counts, readiness, upcoming };
}

function show(data: SummaryData) {
  return render(<AdminSummary period={summaryPeriod} data={data} />);
}

describe('Сводка панели управления', () => {
  it('незаполненные группы названы по-человечески, а не ключами базы', () => {
    show(overview(emptyCounts, unfinishedReadiness, []));

    expect(screen.getByText('Телефон и почта')).toBeInTheDocument();
    expect(screen.getByText('Реквизиты')).toBeInTheDocument();
    expect(screen.queryByText('contacts')).not.toBeInTheDocument();
  });

  it('пока данные не заполнены, ведёт в раздел компании', () => {
    show(overview(emptyCounts, unfinishedReadiness, []));

    expect(screen.getByRole('link', { name: texts.readinessCta })).toHaveAttribute(
      'href',
      '/admin/company',
    );
  });

  it('когда всё заполнено, список групп и призыв исчезают', () => {
    show(overview());

    expect(screen.getByText(texts.readinessDone)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: texts.readinessCta })).not.toBeInTheDocument();
  });

  it('готовность стоит последней при любом состоянии настроек', () => {
    /* 🔴 Позиция карточки не зависит от данных (ADR-241): скелетон их не
       знает, и переезд карточки наверх двигал бы плитки вниз сразу после
       загрузки — ровно тот прыжок, против которого написан issue #334. */
    const orderOf = (container: HTMLElement): { readiness: number; tiles: number } => {
      const blocks = [...container.querySelectorAll('[class*="summary"] > *')];
      return {
        readiness: blocks.findIndex((el) => el.textContent?.includes(texts.readinessTitle)),
        tiles: blocks.findIndex((el) => el.textContent?.includes(texts.leads)),
      };
    };

    const blocking = show(overview(emptyCounts, unfinishedReadiness, []));
    const unfinished = orderOf(blocking.container);
    expect(unfinished.readiness).toBeGreaterThan(unfinished.tiles);

    blocking.unmount();

    const done = show(overview());
    const ready = orderOf(done.container);
    expect(ready.readiness).toBeGreaterThan(ready.tiles);
    expect(ready.readiness).toBe(unfinished.readiness);
  });

  /* 🔴 Вход в панель был единственной страницей без `h1`: заголовки плиток —
     второй уровень, и читалка объявляла экран безымянным (инвариант 4). */
  it('у сводки есть единственный заголовок первого уровня', () => {
    show(overview());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(texts.title);
  });

  it('🔴 три сегмента живут в адресе, первый в него не уезжает', () => {
    show(overview());

    const segments = screen.getByRole('navigation', { name: texts.segmentsLabel });

    expect(
      within(segments).getByRole('link', { name: texts.segmentTitle.overview }),
    ).toHaveAttribute('href', '/admin');
    expect(within(segments).getByRole('link', { name: texts.segmentTitle.work })).toHaveAttribute(
      'href',
      '/admin?tab=work',
    );
    expect(within(segments).getByRole('link', { name: texts.segmentTitle.money })).toHaveAttribute(
      'href',
      '/admin?tab=money',
    );
  });

  it('открытый сегмент отмечен для скринридера, а не только цветом', () => {
    show({ segment: 'money', money: moneySummary });

    expect(screen.getByRole('link', { name: texts.segmentTitle.money })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: texts.segmentTitle.work })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('🔴 плитка целиком ведёт в свой раздел, а не подпись под числом', () => {
    /* Подпись — цель 82×17 при норме 44×44 на сенсорной раскладке (ADR-183):
       ссылкой обязана быть вся плитка, и её имя тогда читается целиком —
       «Новые обращения 3 ждут ответа». */
    show(overview(busyCounts));

    const tiles: readonly (readonly [string, string])[] = [
      [texts.leads, '/admin/leads'],
      [texts.orders, '/admin/orders'],
      [texts.revenue, '/admin?tab=money'],
      [texts.reviews, '/admin/reviews'],
    ];

    for (const [label, href] of tiles) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', href);
    }
  });

  it('🔴 выручка в «Обзоре» — то же число, что в сегменте «Деньги»', () => {
    /* Один источник, а не два отчёта: расхождение этих двух чисел владелец
       заметит первым, и объяснить его будет нечем (issue #344). */
    const { unmount } = show(overview(busyCounts));
    expect(screen.getByText('486 200 ₽')).toBeInTheDocument();
    unmount();

    show({ segment: 'money', money: moneySummary });
    expect(screen.getAllByText('486 200 ₽').length).toBeGreaterThan(0);
  });

  it('показывает ближайшие дела: за ними в панель и заходят', () => {
    show(overview());

    expect(screen.getByText('сегодня 18:00')).toBeInTheDocument();
    expect(screen.getByText('Замер')).toBeInTheDocument();
    expect(screen.getByText('Ирина Соколова')).toBeInTheDocument();
  });

  it('наряд и дело в одном списке различимы словом, а не только цветом', () => {
    show(overview());

    /* ADR-093: наряд — работа с деньгами, дело — напоминание. Списка, в
       котором одно неотличимо от другого, быть не должно. */
    expect(screen.getAllByText(texts.natureTitle('order'))).toHaveLength(2);
    expect(screen.getAllByText(texts.natureTitle('event'))).toHaveLength(2);
  });

  it('каждая строка ведёт в свою сущность: наряд — в карточку, дело — в календарь', () => {
    show(overview());

    expect(screen.getByRole('link', { name: /Ирина Соколова/ })).toHaveAttribute(
      'href',
      '/admin/orders/o1',
    );
    expect(screen.getByRole('link', { name: /Сергей/ })).toHaveAttribute('href', '/admin/crm');
  });

  it('просроченное дело помечено словом, а не одним цветом', () => {
    show(overview(quietCounts, readyReadiness, overdueItems));

    expect(screen.getByText(texts.upcomingOverdue)).toBeInTheDocument();
  });

  it('пустой список объясняет пустоту, а не молчит', () => {
    show(overview(quietCounts, readyReadiness, []));

    expect(screen.getByText(texts.upcomingEmpty)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: texts.upcomingCta })).toHaveAttribute(
      'href',
      '/admin/crm',
    );
  });

  it('сегмент «Работа» отвечает на «успеваем ли», а не на «сколько заработали»', () => {
    show({ segment: 'work', work: workCounts, attention: attentionItems });

    expect(screen.getByText(String(workCounts.done))).toBeInTheDocument();
    expect(screen.getByText(texts.attentionTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.attentionOverdue)).toBeInTheDocument();
    expect(screen.getByText(texts.attentionUnassigned)).toBeInTheDocument();
  });

  it('без срывов список «требуют внимания» говорит это словами', () => {
    show({ segment: 'work', work: workCounts, attention: [] });

    expect(screen.getByText(texts.attentionEmpty)).toBeInTheDocument();
  });

  it('🔴 в сегменте «Деньги» нет ни себестоимости, ни маржи', () => {
    /* CRM.md §11.7: закупочных цен в базе нет вовсе, и решение владельца по
       ним не принято. Слов «себестоимость» и «маржа» в интерфейсе быть не
       должно, пока за ними нет ни данных, ни решения. */
    const { container } = show({ segment: 'money', money: moneySummary });

    expect(container.textContent).not.toMatch(/себестоимост|маржа|закупк/i);
  });

  it('месяц без закрытых нарядов объясняет пустоту, а не рисует пустой график', () => {
    show({ segment: 'money', money: emptyMoney });

    expect(screen.getAllByText(texts.moneyEmpty).length).toBeGreaterThan(0);
  });

  it('доли выручки показаны и суммой, и процентом', () => {
    show({ segment: 'money', money: moneySummary });

    const row = screen.getByText('Монтаж').closest('tr');
    expect(row).not.toBeNull();
    if (row === null) return;

    expect(within(row).getByText('311 400 ₽')).toBeInTheDocument();
    expect(within(row).getByText(texts.moneySharePercent(64))).toBeInTheDocument();
  });

  it('период, за который посчитаны числа, подписан на экране', () => {
    show(overview());

    expect(screen.getByText(summaryPeriod)).toBeInTheDocument();
  });
});
