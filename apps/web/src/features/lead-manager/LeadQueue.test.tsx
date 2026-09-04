import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const refresh = vi.fn();

/* Меню действий строки — клиентский лист: без роутера он не поднимается. */
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

import { LeadQueue } from './LeadQueue';
import { leadManagerContent as texts } from './content';
import { leadQueueFixture, leadQueueNow } from './fixtures';

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
