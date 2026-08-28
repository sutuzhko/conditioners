import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { forgetLeadContext, readLeadContext } from '@/features/lead-form';

import { Pricing } from './Pricing';
import { customRates, priceRows, rates } from './fixtures';
import type { EstimateHandoff } from './model';

/** Цифры из отформатированной суммы: «6 000 ₽» → 6000. */
function money(text: string | null): number {
  return Number((text ?? '').replace(/\D/g, ''));
}

/** Слагаемые разбивки: подпись и сумма. */
function breakdown(): readonly { label: string; amount: number }[] {
  const terms = screen.getAllByRole('term');
  const definitions = screen.getAllByRole('definition');

  return terms.map((term, index) => ({
    label: term.textContent ?? '',
    amount: money(definitions[index]?.textContent ?? ''),
  }));
}

function total(): number {
  return money(screen.getByRole('status', { name: 'Итого за монтаж' }).textContent);
}

function selectOption(name: string, value: string): void {
  fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });
}

function setTrassa(value: number): void {
  fireEvent.change(screen.getByRole('slider'), { target: { value: String(value) } });
}

describe('Цены — таблица монтажа', () => {
  it('рисует строку прайса целиком: мощность, площадь, цену и срок', () => {
    render(<Pricing prices={priceRows} rates={rates} />);

    /* Заголовок строки — мощность с площадью: колонки класса в прайсе нет,
       как и в макете. Класс живёт в калькуляторе, где он выбор, а не факт. */
    const header = screen.getByRole('rowheader', { name: /2\.6 кВт/ });
    expect(header.textContent).toContain('до 27 м²');

    const row = header.closest('tr');
    expect(row).not.toBeNull();
    if (row === null) return;

    const cells = within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent ?? '');
    expect(cells[0]).toContain('6');
    expect(cells[0]).toContain('000');
    expect(cells[1]).toContain('3–4 часа');
  });

  it('условия сметы под таблицей берутся из ставок, а не из вёрстки', () => {
    render(<Pricing prices={priceRows} rates={customRates} />);

    const note = screen.getByText(/Точную стоимость подтвердит/);
    expect(note.textContent).toContain('Трасса до 5 м');
    expect(note.textContent).toContain('Высотные работы с 6 этажа');
  });

  it('пустой прайс не превращается в нули: показывает пустое состояние', () => {
    render(<Pricing prices={[]} rates={rates} />);

    expect(screen.getByText('Прайс пока не заполнен')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('без ставок таблица остаётся, а калькулятор не показывается', () => {
    render(<Pricing prices={priceRows} rates={null} />);

    expect(screen.getByRole('rowheader', { name: /2\.6 кВт/ })).toBeInTheDocument();
    expect(screen.getByText('Онлайн-расчёт временно недоступен')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});

describe('Цены — калькулятор монтажа', () => {
  it('итог равен сумме показанных слагаемых', () => {
    render(
      <Pricing
        prices={priceRows}
        rates={rates}
        calcDefaults={{ cls: '12', trassaM: 8, floor: 12, shtroblenie: true }}
      />,
    );

    const sum = breakdown().reduce((acc, line) => acc + line.amount, 0);
    expect(sum).toBe(total());
    // база 6 500 + трасса (8 − 3) × 700 + высотные 2 000 + штробление 8 × 800
    expect(total()).toBe(18_400);
  });

  it('метры, входящие в базовую цену, не тарифицируются', () => {
    render(<Pricing prices={priceRows} rates={rates} calcDefaults={{ cls: '09' }} />);

    expect(breakdown()).toEqual([{ label: 'Базовый монтаж, класс 09', amount: 6_000 }]);

    setTrassa(rates.trassaIncludedM + 2);
    const trassa = breakdown().find((line) => line.label.startsWith('Трасса'));
    expect(trassa?.label).toContain('2 м');
    expect(trassa?.amount).toBe(2 * rates.trassaPerM);
    expect(total()).toBe(6_000 + 2 * rates.trassaPerM);
  });

  it('шкала трассы начинается с включённых метров — короче трассы не бывает', () => {
    render(<Pricing prices={priceRows} rates={customRates} />);

    expect(screen.getByRole('slider')).toHaveAttribute('min', String(customRates.trassaIncludedM));
  });

  it('порог высотных работ берётся из ставок, а не из «10+» прототипа', () => {
    render(<Pricing prices={priceRows} rates={customRates} calcDefaults={{ cls: '09' }} />);

    const floors = within(screen.getByRole('combobox', { name: 'Этаж' }))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(floors).toEqual(['1–5', '6+']);
    expect(screen.getByText('Высотные работы — с 6 этажа')).toBeInTheDocument();

    selectOption('Этаж', String(customRates.heightFloorFrom));
    const height = breakdown().find((line) => line.label.startsWith('Высотные'));
    expect(height?.label).toContain('этаж 6 и выше');
    expect(height?.amount).toBe(customRates.heightWorks);
  });

  it('этаж ниже порога высотных работ не добавляет строку', () => {
    render(<Pricing prices={priceRows} rates={rates} calcDefaults={{ cls: '09', floor: 12 }} />);

    expect(breakdown().some((line) => line.label.startsWith('Высотные'))).toBe(true);

    selectOption('Этаж', '1');
    expect(breakdown().some((line) => line.label.startsWith('Высотные'))).toBe(false);
  });

  it('количество умножает итог и показывает цену за один блок', () => {
    render(<Pricing prices={priceRows} rates={rates} calcDefaults={{ cls: '09', trassaM: 5 }} />);

    const perUnit = total();
    selectOption('Количество блоков', '3');

    expect(total()).toBe(perUnit * 3);
    const line = breakdown().find((item) => item.label.startsWith('За один блок'));
    expect(line?.amount).toBe(perUnit);
  });

  it('штробление считается по всей длине трассы и подписано действующей ставкой', () => {
    render(<Pricing prices={priceRows} rates={rates} calcDefaults={{ cls: '09', trassaM: 6 }} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Штробление стен/ }));

    const shtrob = breakdown().find((line) => line.label.startsWith('Штробление'));
    expect(shtrob?.amount).toBe(6 * rates.shtrobPerM);
  });

  it('отдаёт расчёт наружу колбэком — тем же, что видит человек на экране', () => {
    const onApplyEstimate = vi.fn<(handoff: EstimateHandoff) => void>();
    render(
      <Pricing
        prices={priceRows}
        rates={rates}
        onApplyEstimate={onApplyEstimate}
        calcDefaults={{ cls: '18', trassaM: 10, floor: 12, shtroblenie: true, qty: 2 }}
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Зафиксировать в заявке' }));

    expect(onApplyEstimate).toHaveBeenCalledTimes(1);
    const handoff = onApplyEstimate.mock.calls[0]?.[0];
    expect(handoff).toBeDefined();
    if (handoff === undefined) return;

    expect(handoff.estimate.total).toBe(total());
    expect(handoff.cls).toBe('18');
    expect(handoff.text).toContain('Класс мощности: 18 · до 50 м²');
    expect(handoff.text).toContain('Штробление: да');
    expect(handoff.text).toContain('Количество блоков: 2');
    // текст заявки повторяет ровно те слагаемые, что видны на экране
    for (const line of breakdown().filter((item) => !item.label.startsWith('За один блок'))) {
      expect(handoff.text).toContain(line.label);
    }
  });
});

afterEach(() => {
  forgetLeadContext();
});

describe('Цены — расчёт уезжает с заявкой', () => {
  it('🔴 в заявку попадает ровно та смета, что на экране', () => {
    render(<Pricing prices={priceRows} rates={rates} />);

    selectOption('Класс мощности', '12');
    setTrassa(7);
    fireEvent.click(screen.getByRole('checkbox'));
    selectOption('Количество блоков', '2');

    const shown = breakdown();
    const shownTotal = total();

    fireEvent.click(screen.getByRole('link', { name: /Зафиксировать/ }));

    const estimate = readLeadContext()?.estimate;
    expect(estimate).toBeDefined();
    expect(estimate?.total).toBe(shownTotal);

    /* Подписи и суммы сверяются со строками разбивки, а не с литералами:
       разойтись формулировкой здесь так же плохо, как разойтись цифрой. */
    for (const line of estimate?.lines ?? []) {
      expect(shown).toContainEqual({ label: line.label, amount: line.amount });
    }
  });

  it('условия расчёта записываются словами из тех же списков', () => {
    render(<Pricing prices={priceRows} rates={rates} />);

    selectOption('Класс мощности', '09');
    fireEvent.click(screen.getByRole('link', { name: /Зафиксировать/ }));

    const params = readLeadContext()?.estimate?.params ?? [];
    expect(params).toContainEqual({ label: 'Класс мощности', value: '09 · до 27 м²' });
    expect(params.map((param) => param.label)).toContain('Штробление');
  });

  it('без перехода к форме ничего не запоминается: снимок — это решение человека', () => {
    render(<Pricing prices={priceRows} rates={rates} />);

    setTrassa(9);

    expect(readLeadContext()).toBeNull();
  });

  it('🔴 кнопка расчёта приносит к форме тему монтажа, но не модель (ADR-129)', () => {
    render(<Pricing prices={priceRows} rates={rates} />);

    expect(screen.getByRole('link', { name: /Зафиксировать/ })).toHaveAttribute(
      'href',
      '/?topic=install#lead',
    );
  });

  it('колбэк страницы отменяет запись в хранилище — историям она не нужна', () => {
    const onApplyEstimate = vi.fn<(handoff: EstimateHandoff) => void>();
    render(<Pricing prices={priceRows} rates={rates} onApplyEstimate={onApplyEstimate} />);

    fireEvent.click(screen.getByRole('link', { name: /Зафиксировать/ }));

    expect(onApplyEstimate).toHaveBeenCalledTimes(1);
    expect(readLeadContext()).toBeNull();
  });
});
