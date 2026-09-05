import { render, screen, within } from '@testing-library/react';

import { staffShortTitle } from '@/entities/staff/model';
import { describe, expect, it } from 'vitest';

import { KIND_FILTER_TITLE, crmContent as texts } from './content';
import { dmitry, installers, monthOrders, sergey } from './fixtures';
import { marksOf, teamLoad } from './schedule';
import { TeamFilter } from './TeamFilter';
import type { CalendarPlace } from './navigation';

const legend = [...marksOf(installers).values()];
const load = teamLoad(monthOrders, installers);

function place(over: Partial<CalendarPlace> = {}): CalendarPlace {
  return {
    view: 'week',
    day: '2026-08-23',
    month: '2026-08',
    today: '2026-08-23',
    team: true,
    who: null,
    kinds: null,
    ...over,
  };
}

function card(over: Partial<CalendarPlace> = {}) {
  render(<TeamFilter place={place(over)} team={legend} load={load} />);

  return screen.getByRole('region', { name: texts.filterLabel });
}

/** Куда ведёт ссылка: сравнивать удобнее по запросу, а не по полному адресу. */
function queryOf(link: HTMLElement): URLSearchParams {
  return new URL(link.getAttribute('href') ?? '', 'https://example.test').searchParams;
}

describe('карточка «Показывать»', () => {
  it('🔴 список имён — он же легенда: цвет не единственный признак человека', () => {
    const panel = card();

    /* 🔴 Видимое имя короткое — «Дмитрий С.»: колонка карточки 240px делится
       между галочкой, именем, часами и «Только», и полное там обрезалось.
       Полное остаётся именем действия, его проверяет соседний случай. */
    expect(within(panel).getByText(staffShortTitle(dmitry))).toBeInTheDocument();
    expect(within(panel).getByText(staffShortTitle(sergey))).toBeInTheDocument();
  });

  it('🔴 рядом с человеком стоят его часы за показанный промежуток', () => {
    const panel = card();
    /* У Дмитрия в фикстурах монтаж 10–13 и ремонт 12–14 внахлёст: пересечение
       не считается дважды, и выходит четыре часа, а не пять. */
    const row = within(panel).getByRole('link', { name: texts.filterHide(dmitry.name ?? '') });

    expect(row).toHaveTextContent('4 ч');
  });

  it('часы не зависят от фильтра: выключенный человек не «обнуляется»', () => {
    const panel = card({ who: [sergey.id] });
    const row = within(panel).getByRole('link', { name: texts.filterShow(dmitry.name ?? '') });

    expect(row).toHaveTextContent('4 ч');
  });

  it('нажатие по человеку убирает его из слоя, а не заводит новый вид', () => {
    const panel = card();
    const link = within(panel).getByRole('link', { name: texts.filterHide(dmitry.name ?? '') });
    const query = queryOf(link);

    expect(query.get('team')).toBe('on');
    expect(query.get('who')).toBe(sergey.id);
  });

  it('выключенный возвращается тем же нажатием', () => {
    const panel = card({ who: [sergey.id] });
    const link = within(panel).getByRole('link', { name: texts.filterShow(dmitry.name ?? '') });

    expect(link).toHaveAttribute('aria-pressed', 'false');
    expect(queryOf(link).get('who')).toBe(`${dmitry.id},${sergey.id}`);
  });

  it('🔴 «только он» — одно нажатие, а не обход списка по одному', () => {
    const panel = card();
    const only = within(panel).getByRole('link', { name: texts.filterOnlyOf(dmitry.name ?? '') });

    expect(queryOf(only).get('who')).toBe(dmitry.id);
  });

  it('у последнего оставшегося «только он» не показывается: нажимать не на что', () => {
    const panel = card({ who: [dmitry.id] });

    expect(
      within(panel).queryByRole('link', { name: texts.filterOnlyOf(dmitry.name ?? '') }),
    ).toBeNull();
  });

  it('🔴 выключенный последним человек гасит слой: слой без людей — его отсутствие', () => {
    const panel = card({ who: [dmitry.id] });
    const link = within(panel).getByRole('link', { name: texts.filterNobody });

    expect(queryOf(link).get('team')).toBeNull();
    expect(queryOf(link).get('who')).toBeNull();
  });

  it('🔴 галочка человека и есть переключатель слоя: с выключенным зажигает его', () => {
    const panel = card({ team: false });
    const link = within(panel).getByRole('link', { name: texts.filterShow(dmitry.name ?? '') });

    expect(link).toHaveAttribute('aria-pressed', 'false');
    expect(queryOf(link).get('team')).toBe('on');
    expect(queryOf(link).get('who')).toBe(dmitry.id);
  });

  it('виды записей снимаются галочкой и живут отдельно от слоя', () => {
    const panel = card();
    const link = within(panel).getByRole('link', {
      name: texts.kindHide(KIND_FILTER_TITLE.leads),
    });

    expect(queryOf(link).get('kinds')).toBe('orders,notes');
    expect(queryOf(link).get('team')).toBe('on');
  });

  it('🔴 снятые все три вида читаются как «все»: пустая сетка без пути назад не нужна', () => {
    const panel = card({ kinds: ['orders'] });
    const link = within(panel).getByRole('link', {
      name: texts.kindHide(KIND_FILTER_TITLE.orders),
    });

    expect(queryOf(link).get('kinds')).toBeNull();
  });

  it('снятый вид переживает смену состава людей', () => {
    const panel = card({ kinds: ['orders'], who: [dmitry.id] });
    const link = within(panel).getByRole('link', { name: texts.filterOnlyOf(sergey.name ?? '') });

    expect(queryOf(link).get('kinds')).toBe('orders');
  });

  it('подвал называет рабочее окно и предупреждает о переработке (ADR-138)', () => {
    const panel = card();

    expect(within(panel).getByText('09–19')).toBeInTheDocument();
    expect(within(panel).getByText(texts.overtimeNote)).toBeInTheDocument();
  });

  it('без команды карточка остаётся: виды записей и окно от людей не зависят', () => {
    render(<TeamFilter place={place()} team={[]} />);
    const panel = screen.getByRole('region', { name: texts.filterLabel });

    expect(within(panel).queryByText(texts.filterPeople)).toBeNull();
    expect(within(panel).getByText(texts.filterKinds)).toBeInTheDocument();
  });
});
