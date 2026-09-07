import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/* 🔴 Строка зовёт `useRouter().refresh()` после удаления и возврата в работу:
   список, счётчики вкладок и строка счёта считаются на сервере, и обновлять
   их по одному на клиенте значит завести четыре источника правды об одном
   числе. В тесте роутера нет — подменяем его, как в опасной зоне монтажника. */
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { OrderList } from './OrderList';
import { orderManagerContent as texts } from './content';
import { declinedPage, emptyPage, historyPage, listFilters, longPage, page } from './fixtures';

/** Момент отсчёта просрочки: без него снимок списка зависел бы от даты прогона. */
const NOW = '2026-08-20T09:00:00.000Z';

/* Сумма разделена неразрывными пробелами, а нормализатор Testing Library
   сводит их к обычным: сравниваем в том же виде (как в выплатах монтажника). */
const money = (value: number): string => texts.money(value).replace(/\s/g, ' ');

describe('Список нарядов', () => {
  it('рисует все наряды страницы строками таблицы', () => {
    render(<OrderList page={page} filters={listFilters()} now={NOW} />);

    /* Строка шапки в счёт не идёт: в таблице она такая же `row`. */
    expect(screen.getAllByRole('row')).toHaveLength(page.items.length + 1);
  });

  it('🔴 у монтажника колонки суммы нет вовсе, а не прочерк в ней', () => {
    const { unmount } = render(<OrderList page={page} filters={listFilters()} now={NOW} />);
    expect(screen.getByRole('columnheader', { name: texts.colSum })).toBeInTheDocument();
    unmount();

    render(<OrderList page={page} filters={listFilters()} now={NOW} forInstaller />);
    expect(screen.queryByRole('columnheader', { name: texts.colSum })).not.toBeInTheDocument();
  });

  it('🔴 пустой список без фильтра зовёт завести первый наряд', () => {
    render(<OrderList page={emptyPage} filters={listFilters()} />);

    expect(screen.getByText(texts.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.emptyText)).toBeInTheDocument();
  });

  it('🔴 пустой список по фильтру объясняется иначе: наряд в другой стопке', () => {
    render(<OrderList page={emptyPage} filters={listFilters({ tab: 'cancelled' })} />);

    expect(screen.getByText(texts.emptyFound)).toBeInTheDocument();
    expect(screen.queryByText(texts.emptyText)).not.toBeInTheDocument();
  });

  it('поиск без находок — тоже фильтр, а не пустая база', () => {
    render(<OrderList page={emptyPage} filters={listFilters({ query: '9999' })} />);

    expect(screen.getByText(texts.emptyFound)).toBeInTheDocument();
  });

  it('монтажнику пустота объясняется его словами', () => {
    render(<OrderList page={emptyPage} filters={listFilters()} forInstaller />);

    expect(screen.getByText(texts.emptyInstaller)).toBeInTheDocument();
  });

  it('🔴 разбивка даёт номера страниц и выбор числа строк', () => {
    render(<OrderList page={longPage} filters={listFilters({ tab: 'all' })} now={NOW} />);

    /* Текущая страница — не ссылка: переход на самого себя ничего не делает,
       и в разметке она помечена, а не только залита (issue #748). */
    expect(screen.getByText(String(longPage.page))).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: texts.pageGo(1) }).getAttribute('href')).toContain(
      '/admin/orders',
    );
    expect(screen.getByRole('combobox', { name: texts.perPage })).toBeInTheDocument();
  });

  it('🔴 смена числа строк возвращает на первую страницу', () => {
    render(<OrderList page={longPage} filters={listFilters()} now={NOW} />);

    const steps = screen.getByRole('combobox', { name: texts.perPage });
    const href = within(steps).getByRole('option', { name: '16' }).getAttribute('value') ?? '';

    expect(href).toContain('size=16');
    expect(href).not.toContain('page=');
  });

  it('итог периода на «Истории» показывает закрытые, выручку и маржу', () => {
    render(
      <OrderList
        page={historyPage}
        filters={listFilters({ tab: 'history' })}
        totals={{ closed: 18, revenue: 612_400, margin: 214_900, marginSkipped: 0 }}
        now={NOW}
      />,
    );

    expect(screen.getByText(texts.historyClosed)).toBeInTheDocument();
    expect(screen.getByText(money(612_400))).toBeInTheDocument();
    /* Маржа считается по движениям склада (ADR-310, issue #628): разность
       «сумма минус выплата» ею не является и здесь не показывается.

       Число, а не подпись: слово «Маржа» на этой вкладке встречается дважды —
       в итоге и в шапке своей колонки, и обе встречи законны. */
    expect(screen.getByText(money(214_900))).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.colMargin })).toBeInTheDocument();
  });

  it('🔴 итог не умалчивает о нарядах, оставшихся без маржи', () => {
    render(
      <OrderList
        page={historyPage}
        filters={listFilters({ tab: 'history' })}
        totals={{ closed: 18, revenue: 612_400, margin: 186_300, marginSkipped: 3 }}
        now={NOW}
      />,
    );

    /* Итог без оговорки владелец прочтёт как полный — и решит по нему, какую
       цену ставить. */
    expect(screen.getByText(texts.historyMarginSkipped(3))).toBeInTheDocument();
  });

  it('🔴 без пропусков оговорки нет: лишняя подпись в итоге только шумит', () => {
    render(
      <OrderList
        page={historyPage}
        filters={listFilters({ tab: 'history' })}
        totals={{ closed: 18, revenue: 612_400, margin: 214_900, marginSkipped: 0 }}
        now={NOW}
      />,
    );

    expect(screen.queryByText(texts.historyMarginSkipped(0))).not.toBeInTheDocument();
  });

  it('плашка «Новых» объясняет, чем грозит наряд без исполнителя', () => {
    render(<OrderList page={page} filters={listFilters({ tab: 'new' })} now={NOW} />);

    expect(screen.getByText(texts.newsAlert(page.total))).toBeInTheDocument();
  });

  it('🔴 на закрытых стопках выбора строк нет: назначать отказ некому', () => {
    render(<OrderList page={declinedPage} filters={listFilters({ tab: 'cancelled' })} now={NOW} />);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
