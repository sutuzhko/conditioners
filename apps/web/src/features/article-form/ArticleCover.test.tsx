import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ArticleCover } from './ArticleCover';
import { articleCoverContent as texts } from './content';

describe('Обложка статьи', () => {
  it('без обложки объясняет, что увидит посетитель', () => {
    render(<ArticleCover cover={null} upload={vi.fn()} />);

    expect(screen.getByText(texts.empty)).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.add))).toBeInTheDocument();
  });

  it('с обложкой предлагает замену, а не повторную загрузку', () => {
    render(<ArticleCover cover="/media/cover.jpg" upload={vi.fn()} />);

    expect(screen.getByAltText(texts.previewAlt)).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.replace))).toBeInTheDocument();
    expect(screen.queryByText(texts.empty)).not.toBeInTheDocument();
  });

  it('без обложки убирать нечего — и кнопки нет', () => {
    render(<ArticleCover cover={null} upload={vi.fn()} remove={vi.fn()} />);

    expect(screen.queryByRole('button', { name: texts.remove })).not.toBeInTheDocument();
  });

  it('снимает обложку и сообщает об этом наверх', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true });
    const onChanged = vi.fn();
    render(
      <ArticleCover
        cover="/media/cover.jpg"
        upload={vi.fn()}
        remove={remove}
        onChanged={onChanged}
        confirmRemove={async () => true}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.remove }));

    await waitFor(() => expect(remove).toHaveBeenCalledOnce());
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  });

  it('🔴 отказ от вопроса ничего не снимает', async () => {
    const remove = vi.fn();
    render(
      <ArticleCover
        cover="/media/cover.jpg"
        upload={vi.fn()}
        remove={remove}
        confirmRemove={async () => false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('отказ сервера показывается и обложку на экране оставляет', async () => {
    render(
      <ArticleCover
        cover="/media/cover.jpg"
        upload={vi.fn()}
        remove={async () => ({ ok: false, message: 'Сервер занят' })}
        confirmRemove={async () => true}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.remove }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер занят');
    expect(screen.getByAltText(texts.previewAlt)).toBeInTheDocument();
  });
});
