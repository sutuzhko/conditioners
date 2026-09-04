import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ERROR_PAGE_CONTENT as t } from '@/shared/config/error-page';
import { POLICY_HREF, SITE_NAV } from '@/shared/config/nav';

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

  it('🔴 уводит в разделы сайта: страница ошибки не тупик (issue #291)', () => {
    render(<RenderError error={new Error('база недоступна')} reset={() => undefined} />);

    for (const item of SITE_NAV) {
      expect(screen.getByRole('link', { name: item.label })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: t.policyLabel })).toHaveAttribute('href', POLICY_HREF);
    expect(screen.getByRole('link', { name: t.brandLabel })).toHaveAttribute('href', '/');
  });

  it('🔴 не ходит в базу: ни одного серверного чтения на клиентском экране', () => {
    /* Проверяется составом импортов модуля, а не мокой: экран появляется
       ровно тогда, когда база не отвечает, и обращение к ней здесь означало
       бы второе падение поверх первого. */
    const source = readFileSync(resolve(import.meta.dirname, 'error.tsx'), 'utf8');

    expect(source).not.toMatch(/@\/server\//);
    expect(source).not.toMatch(/loadSettings|listFeatured|listPublished/);
  });

  it('🔴 не выдумывает данных компании: телефона на экране нет (инвариант 8)', () => {
    render(<RenderError error={new Error('база недоступна')} reset={() => undefined} />);

    expect(document.body.textContent).not.toMatch(/\+7|8[\s(-]?\d{3}/);
  });
});
