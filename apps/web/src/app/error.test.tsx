import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ERROR_PAGE_CONTENT as t } from '@/shared/config/error-page';

import RenderError from './error';

beforeEach(() => {
  // след ошибки в консоли — намеренный, но прогон тестов он только шумит
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('Экран падения рендера', () => {
  it('объясняет сбой и даёт два выхода: повторить и уйти на главную', () => {
    render(<RenderError error={new Error('база недоступна')} reset={() => undefined} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.title);
    expect(screen.getByText(t.lead)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.homeLink })).toHaveAttribute('href', '/');
  });

  it('кнопка повтора зовёт reset — Next перерисует сегмент заново', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<RenderError error={new Error('база недоступна')} reset={reset} />);

    await user.click(screen.getByRole('button', { name: t.retry }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('🔴 не выдумывает данных компании: телефона на экране нет (инвариант 8)', () => {
    render(<RenderError error={new Error('база недоступна')} reset={() => undefined} />);

    expect(document.body.textContent).not.toMatch(/\+7|8[\s(-]?\d{3}/);
  });
});
