import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { articleFormContent } from '@/features/article-form';

import { AdminArticleList } from './AdminArticleList';
import { adminKnowledgeContent as texts } from './content';
import { articleRowsFixture } from './fixtures';

/* Удаление строки — клиентское действие, и оно зовёт маршрутизатор, чтобы
   серверный список перечитался. В тесте его нет — подменяем. */
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const [published, , draft] = articleRowsFixture;

describe('Список статей в админке', () => {
  it('показывает и черновики: черновик — не отсутствующая статья', () => {
    render(<AdminArticleList articles={articleRowsFixture} />);

    expect(screen.getByText('Черновик про монтаж в панельном доме')).toBeInTheDocument();
    expect(screen.getByText(texts.draft)).toBeInTheDocument();
  });

  it('каждая строка ведёт в правку своей статьи', () => {
    render(<AdminArticleList articles={articleRowsFixture} />);

    expect(
      screen.getByRole('link', { name: texts.editLabel('Как часто чистить кондиционер') }),
    ).toHaveAttribute('href', '/admin/knowledge/2');
  });

  /* 🔴 Набор действий строки повторяет набор карточки (issue #575): до этого
     список давал только «Править», и о том, что статью можно убрать, узнавал
     лишь тот, кто открыл карточку и долистал форму до низа. */
  it('строка даёт открыть, править и убрать, не открывая карточку', () => {
    render(<AdminArticleList articles={articleRowsFixture} />);

    const title = published?.title ?? '';
    const actions = screen.getByRole('group', { name: texts.rowActions(title) });

    expect(within(actions).getByRole('link', { name: texts.viewLabel(title) })).toHaveAttribute(
      'href',
      `/knowledge/${published?.slug ?? ''}`,
    );
    expect(within(actions).getByRole('link', { name: texts.editLabel(title) })).toHaveAttribute(
      'href',
      `/admin/knowledge/${published?.id ?? ''}`,
    );
    expect(
      within(actions).getByRole('button', { name: articleFormContent.removeLabel(title) }),
    ).toBeInTheDocument();
  });

  /* 🔴 У черновика адреса на сайте нет: ссылка вела бы в 404. Действие не
     исчезает из ряда — оно отключено и называет причину. */
  it('у черновика «Смотреть на сайте» отключено и объясняет почему', () => {
    render(<AdminArticleList articles={articleRowsFixture} />);

    const title = draft?.title ?? '';
    const actions = screen.getByRole('group', { name: texts.rowActions(title) });

    expect(within(actions).queryByRole('link', { name: texts.viewLabel(title) })).toBeNull();
    expect(
      within(actions).getByRole('button', { name: texts.viewDraftLabel(title) }),
    ).toBeDisabled();
  });

  it('пустой раздел объясняет, зачем нужны статьи', () => {
    render(<AdminArticleList articles={[]} />);

    expect(screen.getByText(texts.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
