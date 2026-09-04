import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LeadQueue } from './LeadQueue';
import { leadManagerContent as texts } from './content';
import { leadQueueFixture } from './fixtures';

describe('Очередь обращений', () => {
  it('ведёт на обращение, сохраняя фильтр и страницу', () => {
    render(<LeadQueue leads={leadQueueFixture} status="new" page={3} />);

    const first = leadQueueFixture[0];
    const link = screen.getByRole('link', { name: new RegExp(first?.name ?? '') });

    /* 🔴 Фильтр и страница переезжают в ссылку: без них выбор обращения
       сбрасывал бы очередь на первую страницу «всех» — и человек терял бы
       место ровно там, где оно было нужно. */
    expect(link).toHaveAttribute('href', `/admin/leads?status=new&page=3&lead=${first?.id ?? ''}`);
  });

  /* 🔴 Открытая строка отмечена не только краской: заливкой одной различие не
     читается ни при нарушениях цветовосприятия, ни на солнце. */
  it('🔴 отмечает открытое обращение в разметке, а не только заливкой', () => {
    render(<LeadQueue leads={leadQueueFixture} selected={leadQueueFixture[1]?.id ?? ''} />);

    const links = screen.getAllByRole('link');
    const current = links.filter((link) => link.getAttribute('aria-current') === 'page');

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(leadQueueFixture[1]?.name ?? '');
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

  it('очередь названа: без имени область ссылок безымянна для озвучки', () => {
    render(<LeadQueue leads={leadQueueFixture} />);

    expect(screen.getByRole('navigation', { name: texts.queueLabel })).toBeInTheDocument();
  });
});
