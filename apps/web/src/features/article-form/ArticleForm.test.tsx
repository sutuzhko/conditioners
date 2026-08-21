import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ArticleForm } from './ArticleForm';
import { articleFormContent as texts } from './content';
import { draftArticle, failingSave, filledArticle, pendingSave, rejectingSave } from './fixtures';
import { emptyArticleValues } from './model';

describe('Форма статьи', () => {
  it('сохраняет введённые значения', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true, id: 'x' }) as const);
    render(<ArticleForm values={filledArticle} save={save} />);

    await user.clear(screen.getByLabelText(new RegExp(texts.category)));
    await user.type(screen.getByLabelText(new RegExp(texts.category)), 'Эксплуатация');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith({ ...filledArticle, category: 'Эксплуатация' });
  });

  it('черновик объясняется: его нет на сайте даже по прямой ссылке', () => {
    render(<ArticleForm values={draftArticle} save={vi.fn()} />);

    expect(screen.getByLabelText(new RegExp(texts.published))).not.toBeChecked();
    expect(screen.getByText(texts.publishedHint)).toBeInTheDocument();
  });

  it('ошибка сервера показывается у названного им поля', async () => {
    const user = userEvent.setup();
    render(<ArticleForm values={filledArticle} save={rejectingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByLabelText(new RegExp(texts.excerpt))).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('отказ без указания поля объясняется над кнопкой', async () => {
    const user = userEvent.setup();
    render(<ArticleForm values={filledArticle} save={failingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
  });

  it('во время сохранения текст заблокирован', async () => {
    const user = userEvent.setup();
    render(<ArticleForm values={filledArticle} save={pendingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('button', { name: texts.saving })).toBeDisabled();
    expect(screen.getByLabelText(new RegExp(texts.body))).toBeDisabled();
  });

  it('у новой статьи кнопка называется иначе и удалять нечего', () => {
    render(<ArticleForm values={emptyArticleValues} save={vi.fn()} isNew />);

    expect(screen.getByRole('button', { name: texts.create })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.remove })).not.toBeInTheDocument();
  });

  it('удаление называет статью по заголовку и без подтверждения не идёт', async () => {
    const user = userEvent.setup();
    const remove = vi.fn();
    const confirmRemove = vi.fn(() => false);
    render(
      <ArticleForm
        values={filledArticle}
        save={vi.fn()}
        remove={remove}
        confirmRemove={confirmRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(confirmRemove).toHaveBeenCalledWith(expect.stringContaining(filledArticle.title));
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('Предпросмотр статьи', () => {
  it('рисуется переданным слотом и обновляется по ходу правки', async () => {
    const user = userEvent.setup();
    render(
      <ArticleForm
        values={{ ...filledArticle, body: 'Первый текст' }}
        save={vi.fn()}
        renderPreview={(body) => <p data-testid="preview">{body}</p>}
      />,
    );

    expect(screen.getByTestId('preview')).toHaveTextContent('Первый текст');

    await user.type(screen.getByLabelText(new RegExp(texts.body)), ' и добавка');

    expect(screen.getByTestId('preview')).toHaveTextContent('Первый текст и добавка');
  });

  it('пустой текст объясняется, а не показывает пустую рамку', () => {
    render(
      <ArticleForm
        values={{ ...filledArticle, body: '' }}
        save={vi.fn()}
        renderPreview={(body) => <p data-testid="preview">{body}</p>}
      />,
    );

    expect(screen.getByText(texts.previewEmpty)).toBeInTheDocument();
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument();
  });

  it('без слота предпросмотра форма работает как обычно', () => {
    render(<ArticleForm values={filledArticle} save={vi.fn()} />);

    expect(screen.queryByText(texts.preview)).not.toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.body))).toBeInTheDocument();
  });
});
