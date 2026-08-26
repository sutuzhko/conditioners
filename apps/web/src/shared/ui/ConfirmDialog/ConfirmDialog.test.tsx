import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from '../Button/Button';
import { ConfirmDialog } from './ConfirmDialog';
import type { ConfirmRequest } from './model';
import { useConfirm } from './useConfirm';

const request: ConfirmRequest = {
  title: 'Удалить статью «Как выбрать кондиционер»?',
  description: 'Отменить это будет нельзя, а её адрес станет недоступен.',
  confirmLabel: 'Удалить статью',
};

describe('ConfirmDialog', () => {
  it('показывает вопрос и последствия, а не одно «ОК»', () => {
    render(<ConfirmDialog open request={request} onResolve={() => {}} />);

    expect(screen.getByRole('dialog')).toHaveAccessibleName(request.title);
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(request.description ?? '');
    expect(screen.getByRole('button', { name: 'Удалить статью' })).toBeInTheDocument();
  });

  it('подтверждение и отказ отвечают по-разному', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();

    const { rerender } = render(<ConfirmDialog open request={request} onResolve={onResolve} />);
    await user.click(screen.getByRole('button', { name: 'Удалить статью' }));
    expect(onResolve).toHaveBeenLastCalledWith(true);

    rerender(<ConfirmDialog open request={request} onResolve={onResolve} />);
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onResolve).toHaveBeenLastCalledWith(false);
  });

  it('🔴 Escape отменяет: действие по умолчанию — отказ, а не удаление', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();

    render(<ConfirmDialog open request={request} onResolve={onResolve} />);
    await user.keyboard('{Escape}');

    expect(onResolve).toHaveBeenCalledWith(false);
  });

  it('фокус уходит в окно, а не остаётся на странице', async () => {
    render(<ConfirmDialog open request={request} onResolve={() => {}} />);

    await waitFor(() => {
      const active = document.activeElement;
      expect(active).toBeInstanceOf(HTMLElement);
      expect(screen.getByRole('dialog')).toContainElement(
        active instanceof HTMLElement ? active : null,
      );
    });
  });

  it('закрытое окно не рисуется вовсе', () => {
    render(<ConfirmDialog open={false} request={request} onResolve={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('подпись отмены переопределяется, подпись действия обязательна', () => {
    render(
      <ConfirmDialog
        open
        request={{ ...request, cancelLabel: 'Не удалять' }}
        onResolve={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Не удалять' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Отмена' })).not.toBeInTheDocument();
  });
});

/** Обёртка повторяет то, как хук зовут семь мест панели. */
function Subject({ onAnswer }: { onAnswer: (confirmed: boolean) => void }) {
  const { confirm, dialog } = useConfirm();
  const [asked, setAsked] = useState(0);

  return (
    <>
      <Button
        onClick={() => {
          setAsked((value) => value + 1);
          void confirm(request).then(onAnswer);
        }}
      >
        Удалить
      </Button>
      <span data-testid="asked">{asked}</span>
      {dialog}
    </>
  );
}

describe('useConfirm', () => {
  it('обещание разрешается тем, что выбрал человек', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();

    render(<Subject onAnswer={onAnswer} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    await user.click(screen.getByRole('button', { name: 'Удалить статью' }));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(true));

    // окно закрылось и второй раз спрашивается заново
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    await waitFor(() => expect(onAnswer).toHaveBeenLastCalledWith(false));
  });
});
