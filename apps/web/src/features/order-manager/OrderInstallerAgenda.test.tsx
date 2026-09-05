import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderInstallerAgenda } from './OrderInstallerAgenda';
import { orderManagerContent as texts } from './content';
import { installerCompanyOrder, installerOrder } from './fixtures';
import { installerContent as own } from './installer-content';

/** День наряда — тот же, что у фикстуры: заголовок группы должен быть «Сегодня». */
const TODAY = '2026-08-28';

const assigned = {
  ...installerCompanyOrder,
  id: 'a1',
  number: 128,
  at: '2026-08-28T06:00:00.000Z',
};
const working = {
  ...installerOrder,
  id: 'a2',
  number: 129,
  status: 'in_progress' as const,
  at: '2026-08-28T11:00:00.000Z',
};
const tomorrow = {
  ...installerCompanyOrder,
  id: 'a3',
  number: 130,
  at: '2026-08-29T07:00:00.000Z',
};

function open(orders = [assigned, working, tomorrow], when: 'today' | 'week' = 'week') {
  return render(<OrderInstallerAgenda orders={orders} when={when} today={TODAY} />);
}

describe('Наряд дня монтажника', () => {
  it('сводка отвечает на первый вопрос дня: сколько выездов и сколько часов', () => {
    open();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(texts.installerTitle);
    expect(screen.getByText(own.summary('week', 3, 540))).toBeInTheDocument();
  });

  it('🔴 группы — по времени, а не по состоянию: сегодня и завтра', () => {
    open();

    const days = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent);

    expect(days[0]).toBe('Сегодня');
    expect(days).toHaveLength(2);
  });

  it('🔴 действия одинаковы у всех карточек, включая ещё не начатые (дефект макета)', () => {
    open();

    for (const order of [assigned, working, tomorrow]) {
      expect(screen.getByRole('link', { name: own.openLabel(order.number) })).toHaveAttribute(
        'href',
        `/admin/orders/${order.id}`,
      );
    }

    expect(screen.getAllByRole('link', { name: /Позвонить клиенту/ })).toHaveLength(3);

    /* Маршрут и звонок — у каждой из трёх карточек, а не только у активной. */
    expect(screen.getAllByRole('link', { name: /Маршрут до объекта/ })).toHaveLength(3);
  });

  it('🔴 номер наряда виден в списке и подан так же, как в карточке', () => {
    open();

    expect(screen.getByText(texts.number(128))).toBeInTheDocument();
    expect(screen.getByText(texts.number(130))).toBeInTheDocument();
  });

  it('🔴 суммы у наряда с оплатой компании нет, у наличных — есть', () => {
    open();

    /* Три наряда, плашка наличных одна: остальные платят компании. */
    const cash = screen.getAllByText(/Наличными/);

    expect(cash).toHaveLength(1);
    expect(cash[0]).toHaveTextContent(/38/);
  });

  it('🔴 в списке нет ни фильтра по монтажнику, ни его имени: это его наряды', () => {
    open();

    expect(screen.queryByLabelText(texts.installerLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(installerOrder.installer?.name ?? '—')).not.toBeInTheDocument();
  });

  it('окно дня — ссылки, и открытое помечено для чтения с экрана', () => {
    open([], 'today');

    const nav = screen.getByRole('navigation', { name: own.whenLabel });
    const links = within(nav).getAllByRole('link');

    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[2]).toHaveAttribute('href', '/admin/orders?when=week');
  });

  it('пустой день объясняет, почему пусто, и ведёт на неделю', () => {
    open([], 'today');

    expect(screen.getByText(own.emptyTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: own.emptyWeek })).toHaveAttribute(
      'href',
      '/admin/orders?when=week',
    );
  });

  it('пустая неделя не предлагает открыть неделю ещё раз', () => {
    open([], 'week');

    expect(screen.queryByRole('link', { name: own.emptyWeek })).not.toBeInTheDocument();
  });
});
