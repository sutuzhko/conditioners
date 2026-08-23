import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { formatNumber } from '@/shared/lib/format';

import { StatList } from './Stat';

/**
 * jsdom не реализует matchMedia. Отвечаем «пользователь просил меньше
 * движения»: счётчик сразу стоит на конечном числе — ровно то состояние,
 * которое обязано быть в серверном HTML (инвариант 1).
 */
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Testing Library схлопывает пробелы, включая неразрывный из formatNumber. */
const visible = (text: string): string => text.replace(/ /g, ' ');

const stats = [
  { value: 1200, suffix: '+', label: 'установок в Туле' },
  { value: 3, suffix: ' года', label: 'гарантия на монтаж' },
];

/* Настройки обрезают значения по краям, поэтому владелец физически не может
   сохранить хвост с пробелом: из админки приходит «года», а не « года». */
const stored = [{ value: 3, suffix: 'года', label: 'гарантия на монтаж' }];

describe('StatList', () => {
  it('рисует цифру с хвостом и подписью', () => {
    render(<StatList items={stats} label="Наши цифры" />);

    const list = screen.getByLabelText('Наши цифры');
    expect(visible(list.textContent ?? '')).toContain(`${visible(formatNumber(1200))}+`);
    expect(list).toHaveTextContent('установок в Туле');
  });

  it('🔴 слово отделяется от числа: «3года» вместо «3 года» читается как опечатка', () => {
    render(<StatList items={stored} label="Наши цифры" />);

    const list = screen.getByLabelText('Наши цифры');
    expect(visible(list.textContent ?? '')).toContain('3 года');
  });

  it('знак остаётся вплотную к числу', () => {
    render(<StatList items={[{ value: 1200, suffix: '+', label: 'установок' }]} label="Цифры" />);

    expect(visible(screen.getByLabelText('Цифры').textContent ?? '')).toContain('1 200+');
  });

  // 🔴 Инварианты 8 и 10: счётчик со значением по умолчанию был бы выдуманным
  // фактом, а пустой <dl> — обещанием цифр, которых нет.
  it('пустой список не рисует ничего', () => {
    const { container } = render(<StatList items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('цифра в разметке настоящая, а не ноль', () => {
    const { container } = render(<StatList items={[{ value: 1200, label: 'установок' }]} />);
    expect(container.querySelector('dt')?.textContent).not.toBe('0');
  });

  it('вариант на тёмной панели отличается классом', () => {
    const { container: light } = render(<StatList items={stats} />);
    const { container: dark } = render(<StatList items={stats} tone="onPanel" />);

    expect(light.querySelector('dl')?.className).not.toBe(dark.querySelector('dl')?.className);
  });
});
