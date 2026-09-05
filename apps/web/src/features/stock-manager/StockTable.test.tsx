import { DEFAULT_STOCK_PAGE_SIZE } from './model';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StockTable } from './StockTable';
import { stockManagerContent as texts } from './content';
import {
  archivedZone,
  bracket,
  emptyOverview,
  freon,
  longOverview,
  noThresholdOverview,
  noZonesOverview,
  overview,
  pipe,
  warehouse,
} from './fixtures';

/* Ячейки остатка — клиентские: они же ручки перемещения (ADR-137). */
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe('Остатки по зонам', () => {
  it('строки — позиции, колонки — зоны хранения', () => {
    render(<StockTable overview={overview} />);

    expect(screen.getByRole('columnheader', { name: new RegExp(warehouse.name) })).toBeVisible();
    expect(screen.getByRole('rowheader', { name: new RegExp(pipe.name) })).toBeVisible();
    /* Итог по позиции считает сервер: таблица его показывает, а не складывает. */
    expect(screen.getByRole('link', { name: pipe.name })).toHaveAttribute(
      'href',
      '/admin/stock/items/s1',
    );
  });

  it('хозяин машины подписан под её названием: зона монтажника видна по связи', () => {
    render(<StockTable overview={overview} />);

    expect(screen.getByText(texts.zoneOwner('Дмитрий Соколов'))).toBeVisible();
  });

  it('позиция ниже порога помечена — это и есть список «пора заказывать»', () => {
    render(<StockTable overview={{ ...overview, items: [bracket], total: 1, lowCount: 1 }} />);

    /* 🔴 Итог помечен пилюлей состояния, а слово стоит рядом для озвучки:
       краску различает не всякий глаз (ADR-081, issue #607). */
    const total = screen.getByTitle(texts.lowTitle);
    expect(total).toHaveTextContent(String(bracket.total));
    expect(within(total).getByText(texts.low)).toBeInTheDocument();
  });

  it('🔴 подходит к порогу — своя пометка, а не «ниже порога» (issue #606)', () => {
    render(<StockTable overview={{ ...overview, items: [freon], total: 1, nearCount: 1 }} />);

    expect(screen.getByTitle(texts.nearTitle)).toBeInTheDocument();
  });

  it('🔴 единица вынесена в свою колонку, в ячейках зон остались числа (issue #607)', () => {
    render(<StockTable overview={{ ...overview, items: [pipe], total: 1 }} />);

    expect(screen.getByRole('columnheader', { name: texts.colUnit })).toBeVisible();

    const row = screen.getByRole('row', { name: new RegExp(pipe.name) });
    /* Число без единицы на экране, единица целиком — в имени ячейки голосом. */
    expect(within(row).getByText('43,5')).toBeVisible();

    const [zone] = within(row).getAllByRole('button');
    /* Атрибут хранит неразрывный пробел как есть — сверяем без схлопывания. */
    expect(zone?.getAttribute('aria-label') ?? '').toContain(
      texts.cellLabel(pipe.name, warehouse.name, texts.qty(43.5, pipe.unit)),
    );
  });

  it('🔴 минус помечен предупреждением, а не отказом: склад разошёлся с реальностью', () => {
    render(<StockTable overview={{ ...overview, items: [freon], total: 1 }} />);

    expect(screen.getByTitle(texts.minusTitle)).toHaveTextContent('−1,5');
    expect(screen.getByText(texts.minusNote)).toBeVisible();
  });

  it('без минуса объяснения про инвентаризацию нет', () => {
    render(<StockTable overview={{ ...overview, items: [pipe], total: 1 }} />);

    expect(screen.queryByText(texts.minusNote)).not.toBeInTheDocument();
  });

  it('🔴 зон нет — раздел объясняет, что заводят сначала', () => {
    render(<StockTable overview={noZonesOverview} />);

    expect(screen.getByRole('heading', { name: texts.emptyZonesTitle })).toBeVisible();
    expect(screen.getByRole('link', { name: texts.emptyZonesAction })).toHaveAttribute(
      'href',
      '/admin/stock?tab=zones',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('пустой справочник объясняет, с чего начать', () => {
    render(<StockTable overview={emptyOverview} />);

    expect(screen.getByRole('heading', { name: texts.emptyItemsTitle })).toBeVisible();
  });

  it('пустой поиск объясняется иначе: справочник не пуст, в нём не нашлось', () => {
    render(
      <StockTable
        overview={emptyOverview}
        filters={{
          query: 'труба',
          group: '',
          size: DEFAULT_STOCK_PAGE_SIZE,
          low: false,
          archived: false,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: texts.emptyFound })).toBeVisible();
    expect(screen.queryByText(texts.emptyItemsText)).not.toBeInTheDocument();
  });

  it('«только к заказу» без находок — своё объяснение', () => {
    render(
      <StockTable
        overview={emptyOverview}
        filters={{
          query: '',
          group: '',
          size: DEFAULT_STOCK_PAGE_SIZE,
          low: true,
          archived: false,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: texts.emptyLow })).toBeVisible();
  });

  it('🔴 фильтр переезжает на соседние страницы вместе с переходом', () => {
    render(
      <StockTable
        overview={longOverview}
        filters={{
          query: 'труба',
          group: 'Крепёж',
          size: DEFAULT_STOCK_PAGE_SIZE,
          low: true,
          archived: false,
        }}
      />,
    );

    expect(screen.getByRole('link', { name: /Дальше/ })).toHaveAttribute(
      'href',
      '/admin/stock?q=%D1%82%D1%80%D1%83%D0%B1%D0%B0&group=%D0%9A%D1%80%D0%B5%D0%BF%D1%91%D0%B6&low=1&page=3',
    );
  });

  it('🔴 из каждой строки можно переместить, не открывая карточку позиции', () => {
    render(<StockTable overview={overview} />);

    const row = screen.getByRole('rowheader', { name: new RegExp(pipe.name) });
    expect(within(row).getByRole('link', { name: texts.moveRowTitle(pipe.name) })).toHaveAttribute(
      'href',
      `/admin/stock/move?item=${pipe.id}&kind=transfer`,
    );
  });

  it('🔴 перемещать некуда, пока зона одна: операции, которую сервер отвергнет, нет', () => {
    render(<StockTable overview={{ ...overview, zones: [warehouse], items: [pipe], total: 1 }} />);

    expect(
      screen.queryByRole('link', { name: texts.moveRowTitle(pipe.name) }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(texts.dragHint)).not.toBeInTheDocument();
  });

  it('архивная зона в счёт не идёт: она колонка истории, а не место хранения', () => {
    render(
      <StockTable
        overview={{ ...overview, zones: [warehouse, archivedZone], items: [pipe], total: 1 }}
      />,
    );

    expect(
      screen.queryByRole('link', { name: texts.moveRowTitle(pipe.name) }),
    ).not.toBeInTheDocument();
  });

  it('на одной странице разбивки нет', () => {
    render(<StockTable overview={overview} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('🔴 без порога заказа колонка не рисуется: это владельческий ключ', () => {
    render(<StockTable overview={noThresholdOverview} />);

    expect(screen.queryByRole('columnheader', { name: texts.colMin })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.colTotal })).toBeVisible();
  });

  it('нулевая зона показана нулём, а не пропуском: «здесь ничего нет» — это ответ', () => {
    render(<StockTable overview={{ ...overview, items: [pipe], total: 1 }} />);

    const row = screen.getByRole('row', { name: new RegExp(pipe.name) });
    expect(within(row).getAllByText('0')).not.toHaveLength(0);
  });

  it('🔴 «Итого» стоит перед «Порогом», как в макете (issue #607)', () => {
    render(<StockTable overview={overview} />);

    const heads = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    const total = heads.indexOf(texts.colTotal);
    const min = heads.indexOf(texts.colMin);

    expect(total).toBeGreaterThan(-1);
    expect(min).toBeGreaterThan(total);
  });

  it('🔴 шаг листания живёт в адресе, а не в коде (issue #608)', () => {
    render(<StockTable overview={{ ...overview, itemsTotal: 42 }} />);

    expect(screen.getByText(texts.perPage)).toBeVisible();
    expect(screen.getByRole('link', { name: texts.perPageSet(8) })).toHaveAttribute(
      'href',
      '/admin/stock?size=8',
    );
  });
});
