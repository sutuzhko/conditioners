import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminSummary, type SummaryData } from './AdminSummary';
import {
  attentionItems,
  busyCounts,
  busyDeltas,
  emptyCharts,
  emptyCounts,
  emptyDeltas,
  emptyMoney,
  filteredUpcoming,
  moneySummary,
  overdueItems,
  pagedUpcoming,
  quietCounts,
  quietDeltas,
  readyReadiness,
  summaryCharts,
  summaryHead,
  summaryPeriod,
  unfinishedReadiness,
  upcomingItems,
  upcomingOf,
  workCounts,
} from './fixtures';
import { adminSummaryContent as texts } from './summary-content';
import type { SummaryDeltas } from './summary-tiles';

/** Сегмент «Обзор» с заданными числами: три четверти тестов начинаются с него. */
function overview(
  counts = quietCounts,
  readiness = readyReadiness,
  upcoming = upcomingOf(upcomingItems),
  deltas: SummaryDeltas = quietDeltas,
  charts = summaryCharts,
): SummaryData {
  return { segment: 'overview', counts, deltas, charts, readiness, upcoming };
}

function show(data: SummaryData) {
  return render(<AdminSummary period={summaryPeriod} head={summaryHead} data={data} />);
}

describe('Сводка панели управления', () => {
  it('незаполненные группы названы по-человечески, а не ключами базы', () => {
    show(overview(emptyCounts, unfinishedReadiness, upcomingOf([]), emptyDeltas, emptyCharts));

    expect(screen.getByText('Телефон и почта')).toBeInTheDocument();
    expect(screen.getByText('Реквизиты')).toBeInTheDocument();
    expect(screen.queryByText('contacts')).not.toBeInTheDocument();
  });

  it('пока данные не заполнены, ведёт в раздел компании', () => {
    show(overview(emptyCounts, unfinishedReadiness, upcomingOf([]), emptyDeltas, emptyCharts));

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

    const blocking = show(
      overview(emptyCounts, unfinishedReadiness, upcomingOf([]), emptyDeltas, emptyCharts),
    );
    const unfinished = orderOf(blocking.container);
    expect(unfinished.readiness).toBeGreaterThan(unfinished.tiles);

    blocking.unmount();

    const done = show(overview());
    const ready = orderOf(done.container);
    expect(ready.readiness).toBeGreaterThan(ready.tiles);
    expect(ready.readiness).toBe(unfinished.readiness);
  });

  /* 🔴 Вход в панель был единственной страницей без `h1`: заголовки плиток —
     второй уровень, и читалка объявляла экран безымянным (инвариант 4).
     Заголовком служит приветствие — так в макете «Обзор» (issue #588). */
  it('у сводки есть единственный заголовок первого уровня', () => {
    show(overview());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(summaryHead.greeting);
  });

  it('🔴 шапка здоровается и называет день с числом выездов', () => {
    /* Имя приходит из сессии, число выездов — из данных: ни одной цифры о
       работе компании в коде (инвариант 8). */
    show(overview());

    expect(screen.getByText(summaryHead.dayLine)).toBeInTheDocument();
  });

  it('главное действие шапки заводит наряд', () => {
    show(overview());

    expect(screen.getByRole('link', { name: texts.newOrder })).toHaveAttribute(
      'href',
      '/admin/orders/new',
    );
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
    show(overview(busyCounts, readyReadiness, upcomingOf(upcomingItems), busyDeltas));

    const tiles: readonly (readonly [string, string])[] = [
      [texts.leads, '/admin/leads'],
      [texts.orders, '/admin/orders'],
      [texts.revenue, '/admin?tab=money'],
      [texts.retained, '/admin?tab=money'],
    ];

    for (const [label, href] of tiles) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', href);
    }
  });

  /* 🔴 Плитка называет ровно то, что считает (ADR-318): выручка минус выплаты
     монтажникам — это не прибыль, в ней нет ни материалов, ни налогов, и по
     этому числу владелец назначает цену монтажа. */
  it('🔴 четвёртая плитка не называет остаток прибылью и не обещает маржу', () => {
    const { container } = show(overview(busyCounts));

    expect(screen.getByText(texts.retained)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/прибыл|маржа|остаётся за месяц/i);
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

  /* 🔴 Чип изменения показывается только там, где есть с чем сравнивать
     (issue #590): «рост со ста процентов» у пустого месяца — число ни о чём. */
  it('у пустого сайта нет ни одного чипа изменения', () => {
    const { container } = show(
      overview(emptyCounts, readyReadiness, upcomingOf([]), emptyDeltas, emptyCharts),
    );

    expect(container.querySelectorAll('[class*="delta"]')).toHaveLength(0);
  });

  it('залежавшееся обращение помечено тревогой, а не стрелкой вниз', () => {
    show(overview(busyCounts, readyReadiness, upcomingOf(upcomingItems), busyDeltas));

    /* «↓ 1 сутки» читалось бы ровно наоборот тому, что означает. */
    expect(screen.getByText(texts.leadsStaleDay(1))).toBeInTheDocument();
    expect(screen.getAllByText('требует внимания').length).toBeGreaterThan(0);
  });

  /* 🔴 Два графика на первом экране (issue #589, макет «Обзор»). */
  it('показывает оба графика и называет их числа для озвучки', () => {
    show(overview(busyCounts));

    const charts = screen.getAllByRole('img');
    const names = charts.map((chart) => chart.getAttribute('aria-label') ?? '');

    expect(names.some((name) => name.startsWith(texts.weeksChartTitle))).toBe(true);
    expect(names.some((name) => name.startsWith(texts.moneyLinesTitle))).toBe(true);
  });

  it('столбцами рисуются недели, ломаными — деньги', () => {
    const { container } = show(overview(busyCounts));

    /* Считаются холсты графиков, а не любые `svg`: значки строк тоже рисуются
       прямоугольниками, и общий счёт по документу проверял бы иконки. */
    expect(container.querySelectorAll('svg[role="img"] rect').length).toBe(
      summaryCharts.weeks.values.length,
    );
    expect(container.querySelectorAll('svg[role="img"] path').length).toBe(2);
  });

  it('месяц без единого закрытого наряда объясняет пустоту, а не рисует пустой график', () => {
    show(overview(emptyCounts, readyReadiness, upcomingOf([]), emptyDeltas, emptyCharts));

    expect(screen.getByText(texts.weeksChartEmpty)).toBeInTheDocument();
    expect(screen.getByText(texts.moneyLinesEmpty)).toBeInTheDocument();
  });

  it('показывает ближайшие дела таблицей: за ними в панель и заходят', () => {
    show(overview());

    expect(screen.getByRole('columnheader', { name: texts.colWhen })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.colWork })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.colSum })).toBeInTheDocument();
    expect(screen.getByText('Замер')).toBeInTheDocument();
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

    expect(screen.getByRole('link', { name: texts.rowOpenOrder(1059) })).toHaveAttribute(
      'href',
      '/admin/orders/o1',
    );
    expect(
      screen.getByRole('link', { name: texts.rowOpenEvent('Замер · Ирина Белова') }),
    ).toHaveAttribute('href', '/admin/crm?day=2026-08-29&view=day');
  });

  /* 🔴 Удаления наряда в строке дайджеста нет намеренно: решение принимают в
     карточке, где видны клиент, сумма и история. Полный набор действий над
     нарядом живёт в «Заказах». */
  it('в строке три безопасных действия и ни одного разрушающего', () => {
    show(overview());

    expect(screen.getByRole('link', { name: texts.rowCall('Ирина Соколова') })).toHaveAttribute(
      'href',
      'tel:+79101552469',
    );
    expect(screen.queryByRole('button', { name: /удалить/i })).not.toBeInTheDocument();
  });

  it('дело без телефона не получает кнопку звонка в никуда', () => {
    show(overview());

    expect(screen.queryByRole('link', { name: texts.rowCall('Ирина Белова') })).toBeNull();
  });

  it('просроченная строка помечена словом, а не одним цветом', () => {
    show(overview(quietCounts, readyReadiness, upcomingOf(overdueItems)));

    expect(screen.getByText(texts.attentionOverdue)).toBeInTheDocument();
  });

  it('пустой список объясняет пустоту, а не молчит', () => {
    show(overview(quietCounts, readyReadiness, upcomingOf([])));

    expect(screen.getByText(texts.upcomingEmpty)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: texts.upcomingCta })).toHaveAttribute(
      'href',
      '/admin/crm',
    );
  });

  /* Пустой отбор и пустой план — разные новости, и шаги у них противоположные. */
  it('пустой отбор объясняется иначе, чем пустой план', () => {
    show(
      overview(quietCounts, readyReadiness, {
        ...filteredUpcoming,
        items: [],
        total: 0,
      }),
    );

    expect(screen.getByText(texts.upcomingNotFound)).toBeInTheDocument();
  });

  it('🔴 применённое условие видно плашкой и снимается одним нажатием', () => {
    show(overview(quietCounts, readyReadiness, filteredUpcoming));

    const drop = screen.getByRole('link', {
      name: new RegExp(texts.dropFilter(texts.showTitle.overdue)),
    });
    expect(drop).toHaveAttribute(
      'href',
      '/admin?q=%D0%9E%D0%B1%D0%BE%D1%80%D0%BE%D0%BD%D0%BD%D0%B0%D1%8F',
    );
  });

  it('состояние отбора живёт в адресе, а не в компоненте', () => {
    show(overview(quietCounts, readyReadiness, filteredUpcoming));

    const href = screen.getByRole('link', { name: texts.sortTitle.sum }).getAttribute('href') ?? '';

    /* Порядок меняется переходом, а прежние условия при этом не теряются. */
    expect(href).toContain('sort=sum');
    expect(href).toContain('show=overdue');
  });

  it('разбивка на страницы появляется, когда страниц больше одной', () => {
    show(overview(quietCounts, readyReadiness, pagedUpcoming));

    expect(screen.getByRole('navigation', { name: texts.pagerLabel })).toBeInTheDocument();
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
