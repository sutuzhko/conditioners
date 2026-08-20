import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { SavingsBlock } from './SavingsBlock';
import { savingsContent } from './content';
import { HOURS_DEFAULT, TARIFF_DEFAULT } from './model';

/** Суммы набраны с неразрывными пробелами — сравниваем по одним цифрам. */
function digitsOf(text: string): string {
  return text.replace(/\D/g, '');
}

/** Строка результата целиком: подпись и сумма лежат в одном абзаце. */
function lineWith(label: string): string {
  const line = screen.getByText(label).parentElement;
  if (line === null) throw new Error(`Строка «${label}» не найдена`);
  return line.textContent ?? '';
}

describe('Экономия инвертора — расчёт', () => {
  it('на стартовых значениях показывает расход обеих моделей', () => {
    render(<SavingsBlock />);

    // 0,75 × 8 × 120 × 6,5 = 4680; инвертор — 62%, то есть 2902 после округления
    expect(digitsOf(lineWith(savingsContent.usual))).toContain('4680');
    expect(digitsOf(lineWith(savingsContent.inverter))).toContain('2902');
    expect(digitsOf(lineWith(savingsContent.saving))).toContain('1778');
  });

  it('стартовые значения ползунков видны рядом с подписями', () => {
    render(<SavingsBlock />);

    expect(screen.getByText(savingsContent.hours(HOURS_DEFAULT))).toBeInTheDocument();
    expect(screen.getByText(savingsContent.tariff(TARIFF_DEFAULT))).toBeInTheDocument();
  });

  it('смена тарифа меняет результат', () => {
    render(<SavingsBlock />);

    const before = lineWith(savingsContent.saving);
    fireEvent.change(screen.getByLabelText(savingsContent.tariffLabel), { target: { value: '9' } });
    const after = lineWith(savingsContent.saving);

    expect(after).not.toBe(before);
    // 0,75 × 8 × 120 × 9 = 6480; экономия — 38% от неё, 2462 после округления
    expect(digitsOf(after)).toContain('2462');
  });

  it('смена часов работы меняет результат', () => {
    render(<SavingsBlock />);

    const before = lineWith(savingsContent.saving);
    fireEvent.change(screen.getByLabelText(savingsContent.hoursLabel), { target: { value: '16' } });

    // 0,75 × 16 × 120 × 6,5 = 9360; экономия — 3557 после округления
    expect(lineWith(savingsContent.saving)).not.toBe(before);
    expect(digitsOf(lineWith(savingsContent.saving))).toContain('3557');
  });

  it('стартовый тариф можно задать снаружи — он не зашит в блок', () => {
    render(<SavingsBlock defaultTariff={5} />);

    expect(screen.getByText(savingsContent.tariff(5))).toBeInTheDocument();
    expect(screen.queryByText(savingsContent.tariff(TARIFF_DEFAULT))).not.toBeInTheDocument();
  });
});

describe('Экономия инвертора — честность цифр', () => {
  it('у блока есть оговорка про приблизительность расчёта', () => {
    render(<SavingsBlock />);

    const disclaimer = screen.getByText(savingsContent.disclaimer);

    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer.textContent).toMatch(/не расчёт по счётчику/);
    expect(disclaimer.textContent).toMatch(/зависит от режима работы/);
  });

  it('рядом с цифрами стоит метка «оценка»', () => {
    render(<SavingsBlock />);

    expect(screen.getByText(savingsContent.estimateBadge)).toBeInTheDocument();
  });

  it('каждая сумма подписана знаком приблизительности', () => {
    render(<SavingsBlock />);

    for (const label of [savingsContent.usual, savingsContent.inverter, savingsContent.saving]) {
      expect(lineWith(label)).toContain('≈');
    }
  });

  it('ссылка на разбор появляется только когда адрес статьи задан', () => {
    const { unmount } = render(<SavingsBlock />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    unmount();

    render(<SavingsBlock articleHref="#invertor-ili-onoff" />);
    expect(screen.getByRole('link', { name: savingsContent.leadArticleText })).toHaveAttribute(
      'href',
      '#invertor-ili-onoff',
    );
  });
});
