import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { leadHref } from '@/shared/config/lead';

import { pricingText } from '../content';
import { TotalBar } from './TotalBar';

const href = leadHref({ topic: 'install' });

/** Цифры из строки: «18 400 ₽» → «18400». Пустая строка — цифр нет вовсе. */
function digitsOf(text: string | null | undefined): string {
  return (text ?? '').replace(/\D/g, '');
}

function bar(): HTMLElement {
  return screen.getByRole('status', { name: pricingText.totalLabel });
}

function cta(): HTMLElement {
  return screen.getByRole('link', { name: pricingText.apply });
}

describe('Полоса итога — сумма', () => {
  it('показывает сумму и ведёт к заявке', () => {
    const onApply = vi.fn();
    render(<TotalBar state="ready" amount={18_400} href={href} onApply={onApply} />);

    expect(digitsOf(bar().textContent)).toBe('18400');
    expect(cta()).not.toHaveAttribute('aria-disabled');

    fireEvent.click(cta());
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});

describe('Полоса итога — пересчёт', () => {
  it('🔴 не показывает числа, пока сумма устарела', () => {
    render(<TotalBar state="pending" href={href} />);

    expect(digitsOf(bar().textContent)).toBe('');
    expect(bar()).toHaveAttribute('aria-busy', 'true');
  });

  it('🔴 кнопка не нажимается, но имя её остаётся доступным (ADR-159)', () => {
    const onApply = vi.fn();
    render(<TotalBar state="pending" href={href} onApply={onApply} />);

    /* Отказ через `aria-disabled`, а не через `visibility: hidden` и не
       подменой ссылки: кнопка остаётся в обходе с клавиатуры и называет
       себя, но переход к форме с устаревшей сметой не происходит. */
    const link = cta();
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAccessibleName(pricingText.apply);

    fireEvent.click(link);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('состояние пересчёта слышно голосом, а не только видно', () => {
    render(<TotalBar state="pending" href={href} />);

    expect(screen.getByText(pricingText.totalPending)).toBeInTheDocument();
  });
});

describe('Полоса итога — считаем по телефону', () => {
  it('🔴 вместо суммы говорит словами и не называет ни одного числа', () => {
    render(<TotalBar state="onsite" href={href} />);

    expect(bar().textContent).toBe(pricingText.onSite);
    expect(digitsOf(bar().textContent)).toBe('');
  });

  it('кнопка остаётся активной: заявка — и есть ответ на этот случай', () => {
    const onApply = vi.fn();
    render(<TotalBar state="onsite" href={href} onApply={onApply} />);

    expect(cta()).not.toHaveAttribute('aria-disabled');
    fireEvent.click(cta());
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
