import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/* В шапке живёт клавиатура календаря, а она берёт роутер. Вне приложения его
   нет, и без подмены падает вся проверка шапки, а не клавиатуры. */
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { CalendarNav } from './CalendarNav';
import { crmContent as texts } from './content';

function nav(patch: Partial<Parameters<typeof CalendarNav>[0]> = {}) {
  return render(
    <CalendarNav
      view="month"
      month="2026-08"
      day="2026-08-23"
      today="2026-08-23"
      overdue={0}
      {...patch}
    />,
  );
}

describe('Шапка календаря', () => {
  it('🔴 вид живёт в адресе и по-английски — инвариант 17', () => {
    nav();

    expect(screen.getByRole('link', { name: 'Неделя' })).toHaveAttribute(
      'href',
      '/admin/crm?view=week&day=2026-08-23',
    );
    expect(screen.getByRole('link', { name: 'День' })).toHaveAttribute(
      'href',
      '/admin/crm?view=day&day=2026-08-23',
    );
  });

  it('🔴 переключателя занятости команды у монтажника нет вовсе (ADR-095)', () => {
    nav();

    expect(screen.queryByRole('link', { name: texts.team })).toBeNull();
  });

  it('🔴 занятость команды — переключатель в адресе, а не состояние на клиенте', () => {
    nav({ canTeam: true, view: 'week' });

    const toggle = screen.getByRole('link', { name: texts.team });

    expect(toggle).toHaveAttribute('href', '/admin/crm?view=week&day=2026-08-23&team=on');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('включённое наложение снимается той же кнопкой и помечено не только цветом', () => {
    nav({ canTeam: true, view: 'week', team: true });

    const toggle = screen.getByRole('link', { name: texts.team });

    expect(toggle).toHaveAttribute('href', '/admin/crm?view=week&day=2026-08-23');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('наложение переживает смену вида и листание', () => {
    nav({ canTeam: true, view: 'week', team: true });

    expect(screen.getByRole('link', { name: 'День' })).toHaveAttribute(
      'href',
      '/admin/crm?view=day&day=2026-08-23&team=on',
    );
    expect(screen.getByRole('link', { name: texts.nextWeek })).toHaveAttribute(
      'href',
      '/admin/crm?view=week&day=2026-08-30&team=on',
    );
  });

  it('открытый вид помечен не только цветом', () => {
    nav({ view: 'week' });

    expect(screen.getByRole('link', { name: 'Неделя' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Месяц' })).not.toHaveAttribute('aria-current');
  });

  it('месяц листается месяцами', () => {
    nav();

    expect(screen.getByRole('link', { name: texts.nextMonth })).toHaveAttribute(
      'href',
      '/admin/crm?view=month&month=2026-09',
    );
  });

  it('неделя листается неделями, а не месяцами', () => {
    nav({ view: 'week' });

    expect(screen.getByRole('link', { name: texts.nextWeek })).toHaveAttribute(
      'href',
      '/admin/crm?view=week&day=2026-08-30',
    );
  });

  it('день листается днями', () => {
    nav({ view: 'day' });

    expect(screen.getByRole('link', { name: texts.prevDay })).toHaveAttribute(
      'href',
      '/admin/crm?view=day&day=2026-08-22',
    );
  });

  it('заголовок называет то, что показано', () => {
    nav();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Август 2026');

    nav({ view: 'week' });
    expect(screen.getAllByRole('heading', { level: 2 })[1]).toHaveTextContent('17–23 августа 2026');

    nav({ view: 'day' });
    expect(screen.getAllByRole('heading', { level: 2 })[2]).toHaveTextContent('23 августа 2026');
  });

  it('неделя на стыке месяцев называет оба', () => {
    nav({ view: 'week', day: '2026-08-31' });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      '31 августа – 6 сентября 2026',
    );
  });

  it('«сегодня» остаётся в том же виде, в котором его нажали', () => {
    nav({ view: 'day', today: '2026-09-01' });

    expect(screen.getByRole('link', { name: texts.today })).toHaveAttribute(
      'href',
      '/admin/crm?view=day&day=2026-09-01',
    );
  });

  it('просрочка ведёт в сегодняшний день, а не остаётся надписью', () => {
    nav({ overdue: 3 });

    expect(screen.getByRole('link', { name: texts.overdue(3) })).toHaveAttribute(
      'href',
      '/admin/crm?view=day&day=2026-08-23',
    );
  });

  it('🔴 запись заводится из шапки: клик по сетке — ускоритель, а не единственный вход', () => {
    nav();

    expect(screen.getByRole('button', { name: texts.add })).toBeInTheDocument();
  });

  it('занятость отмечается оттуда же: своя, на открытый день (ADR-115)', () => {
    nav();

    expect(screen.getByRole('button', { name: texts.busyAdd })).toBeInTheDocument();
  });
});
