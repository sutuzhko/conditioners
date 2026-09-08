import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tableAboveClassName } from '@/shared/ui';

const push = vi.fn();
const refresh = vi.fn();

/* Меню действий строки — клиентский лист: без роутера он не поднимается. */
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

import { LeadQueue } from './LeadQueue';
import { leadManagerContent as texts } from './content';
import { leadQueueFixture, leadQueueNow, workTypeInstall } from './fixtures';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Очередь обращений', () => {
  it('ведёт на обращение, сохраняя фильтр, поиск и страницу', () => {
    render(
      <LeadQueue leads={leadQueueFixture} status="new" page={3} query="Ирина" now={leadQueueNow} />,
    );

    const first = leadQueueFixture[0];
    const link = screen.getByRole('link', { name: new RegExp(first?.name ?? '') });

    /* 🔴 Фильтр, поиск и страница переезжают в ссылку: без них выбор обращения
       сбрасывал бы очередь на первую страницу «всех» — и человек терял бы
       место ровно там, где оно было нужно. */
    expect(link).toHaveAttribute(
      'href',
      `/admin/leads?status=new&q=%D0%98%D1%80%D0%B8%D0%BD%D0%B0&page=3&lead=${first?.id ?? ''}`,
    );
  });

  /* 🔴 Открытая строка отмечена не только краской: заливкой одной различие не
     читается ни при нарушениях цветовосприятия, ни на солнце. */
  it('🔴 отмечает открытое обращение в разметке, а не только заливкой', () => {
    render(
      <LeadQueue
        leads={leadQueueFixture}
        selected={leadQueueFixture[1]?.id ?? ''}
        now={leadQueueNow}
      />,
    );

    const links = screen.getAllByRole('link');
    const current = links.filter((link) => link.getAttribute('aria-current') === 'page');

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(leadQueueFixture[1]?.name ?? '');
  });

  /* 🔴 Номер и относительное время — то, ради чего очередь стала таблицей
     (issue #601): по номеру на обращение ссылаются вслух, по времени решают,
     кому звонить первым. */
  it('показывает номер обращения и сколько оно ждёт', () => {
    render(<LeadQueue leads={leadQueueFixture} now={leadQueueNow} />);

    const row = screen.getByRole('cell', { name: String(leadQueueFixture[1]?.number ?? 0) });
    expect(row).toBeInTheDocument();

    // 30 августа 11:19 минус 09:19 — два часа
    expect(screen.getByText('2 часа назад')).toBeInTheDocument();
  });

  it('адрес приписан к имени, а его отсутствие названо словами', () => {
    render(<LeadQueue leads={leadQueueFixture} now={leadQueueNow} />);

    expect(screen.getByText('Тула, Кирова 18 · нужен замер')).toBeInTheDocument();
    expect(screen.getByText(texts.addressUnset)).toBeInTheDocument();
  });

  it('пустой раздел не винит фильтр', () => {
    render(<LeadQueue leads={[]} />);

    expect(screen.getByRole('heading', { name: texts.emptyTitle })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: texts.emptyFiltered })).not.toBeInTheDocument();
  });

  it('пустая выборка под фильтром объясняется фильтром и даёт выход', () => {
    render(<LeadQueue leads={[]} filtered />);

    expect(screen.getByRole('heading', { name: texts.emptyFiltered })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: texts.emptyFilteredAction })).toHaveAttribute(
      'href',
      '/admin/leads',
    );
  });

  it('очередь названа: без имени область прокрутки безымянна для озвучки', () => {
    render(<LeadQueue leads={leadQueueFixture} now={leadQueueNow} />);

    expect(screen.getByRole('region', { name: texts.queueLabel })).toBeInTheDocument();
  });

  /**
   * 🔴 Нажимается вся строка, но целей у неё не прибавилось (issue #740).
   * Шесть ссылок по числу ячеек превратили бы список из пяти обращений в
   * тридцать одинаковых остановок табуляции, а озвучку списка — в перечень
   * из тридцати имён.
   */
  it('🔴 на строку приходится одна ссылка, и подпись называет обращение', () => {
    render(<LeadQueue leads={leadQueueFixture} now={leadQueueNow} />);

    const first = leadQueueFixture[0];
    const row = screen.getAllByRole('row')[1];
    expect(row).toBeDefined();
    if (row === undefined) return;

    expect(within(row).getAllByRole('link')).toHaveLength(1);
    expect(
      within(row).getByRole('link', {
        name: texts.rowOpen(first?.number ?? 0, first?.name ?? ''),
      }),
    ).toBeInTheDocument();
  });

  /**
   * 🔴 Раздел решает ровно одно: что поднято над перекрытием строки. Сам
   * приём живёт в ките (`TableRow`), и его сторожит китовый тест; здесь
   * проверяется выбор очереди — адрес и меню действий.
   *
   * Без адреса выше перекрытия протяжка мышью даёт пустую строку вместо
   * выделенного адреса и засчитывается как нажатие по ссылке; без поднятого
   * меню «Позвонить» открывает карточку вместо звонка.
   */
  it('🔴 над перекрытием строки подняты адрес и меню действий', () => {
    render(<LeadQueue leads={leadQueueFixture} now={leadQueueNow} />);

    const first = leadQueueFixture[0];
    const row = screen.getAllByRole('row')[1];
    expect(row).toBeDefined();
    if (row === undefined) return;

    expect(within(row).getByText(first?.address ?? '')).toHaveClass(tableAboveClassName());

    /* `closest`, а не `parentElement`: меню кита само оборачивает свою
       кнопку, и число обёрток между ними — его дело, а не очереди. */
    const menu = within(row).getByRole('button', { name: texts.rowActions(first?.number ?? 0) });
    expect(menu.closest(`.${tableAboveClassName()}`)).not.toBeNull();
  });

  /**
   * 🔴 Ярлык темы красит справочник, а не раздел (ADR-343, issue #839): у
   * «монтажа» в очереди тот же цвет, что у монтажа в календаре и в наряде.
   * Рядом с краской обязательно стоит слово — цвет не единственный признак
   * (WCAG 1.4.1, issue #840).
   */
  it('🔴 ярлык вида работ несёт подпись из справочника, а не один цвет', () => {
    render(<LeadQueue leads={leadQueueFixture} now={leadQueueNow} />);

    const row = screen.getAllByRole('row')[1];
    expect(row).toBeDefined();
    if (row === undefined) return;

    expect(within(row).getByText(workTypeInstall.title)).toBeInTheDocument();
  });

  /** Переименование вида работ в справочнике видно в очереди сразу. */
  it('подпись ярлыка приходит из записи справочника, а не из словаря раздела', () => {
    const [first] = leadQueueFixture;
    expect(first).toBeDefined();
    if (first === undefined) return;

    render(
      <LeadQueue
        leads={[{ ...first, workType: { ...workTypeInstall, title: 'Чистка дренажа' } }]}
        now={leadQueueNow}
      />,
    );

    expect(screen.getByText('Чистка дренажа')).toBeInTheDocument();
  });

  /**
   * 🔴 Проверка задачи #841: такими пришли все обращения до справочника, и их
   * в базе большинство. Строка обязана показать свободную тему и не упасть.
   */
  it('🔴 заявка без вида работ остаётся в очереди со своей темой', () => {
    const bare = leadQueueFixture.find((lead) => lead.workType === null);
    expect(bare).toBeDefined();
    if (bare === undefined) return;

    render(<LeadQueue leads={[bare]} now={leadQueueNow} />);

    expect(screen.getByText(bare.topic)).toBeInTheDocument();
  });

  /* 🔴 Действия строки достижимы из списка, а не только из открытой карточки
     (issue #601). */
  it('у каждой строки есть меню действий со своим именем', async () => {
    render(<LeadQueue leads={leadQueueFixture} now={leadQueueNow} />);

    const first = leadQueueFixture[0];
    const menu = screen.getByRole('button', { name: texts.rowActions(first?.number ?? 0) });

    await userEvent.click(menu);

    expect(
      within(screen.getByRole('menu')).getByRole('menuitem', { name: texts.remove }),
    ).toBeInTheDocument();
  });
});
