import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SavingsBlock } from './SavingsBlock';
import { savingsContent } from './content';
import { HOURS_DEFAULT, TARIFF_NIGHT_DEFAULT } from './model';

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

/** Двадцать четыре ячейки сетки по порядку часов. */
function hourCells(): readonly HTMLElement[] {
  return within(screen.getByRole('group', { name: savingsContent.gridLabel })).getAllByRole(
    'button',
  );
}

function cellAt(hour: number): HTMLElement {
  const cell = hourCells()[hour];
  if (cell === undefined) throw new Error(`Ячейки ${hour} нет в сетке`);
  return cell;
}

/** Сумма отмеченных часов: она же живая область для скринридера. */
function totalOutput(): HTMLElement {
  return screen.getByRole('status', { name: savingsContent.gridTotalLabel });
}

function totalHours(): string {
  return digitsOf(totalOutput().textContent ?? '');
}

/**
 * jsdom не реализует `PointerEvent`, поэтому событие протяжки собирается
 * руками: без `pointerType` компонент считает указатель сенсорным и красить
 * не начинает — ровно так же, как на телефоне.
 */
function pointerEvent(type: string, target: Element, pointerType = 'mouse'): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(target, event);
}

describe('Экономия инвертора — расчёт', () => {
  it('на стартовых значениях показывает расход обеих моделей', () => {
    render(<SavingsBlock />);

    // 0,75 × 120 × 8 ч × 6,5 = 4680; инвертор — 62%, то есть 2902 после округления
    expect(totalHours()).toBe(String(HOURS_DEFAULT.length));
    expect(digitsOf(lineWith(savingsContent.usual))).toContain('4680');
    expect(digitsOf(lineWith(savingsContent.inverter))).toContain('2902');
    expect(digitsOf(lineWith(savingsContent.saving))).toContain('1778');
  });

  it('стартовые значения приходят пропсами — в блоке они не зашиты', () => {
    render(<SavingsBlock defaultHours={[0, 1]} defaultTariffDay={5} defaultTariffMode="dual" />);

    expect(totalHours()).toBe('2');
    // значение ползунка сверяем по aria-valuetext: там оно в том же виде,
    // в каком его видит глаз, но без нормализации пробелов
    expect(screen.getByLabelText(savingsContent.tariffDayDual)).toHaveAttribute(
      'aria-valuetext',
      savingsContent.tariff(5),
    );
    expect(screen.getByLabelText(savingsContent.tariffNight)).toHaveAttribute(
      'aria-valuetext',
      savingsContent.tariff(TARIFF_NIGHT_DEFAULT),
    );
  });

  it('смена дневного тарифа меняет результат', () => {
    render(<SavingsBlock />);

    fireEvent.change(screen.getByLabelText(savingsContent.tariffDaySingle), {
      target: { value: '9' },
    });

    // 0,75 × 120 × 8 ч × 9 = 6480; экономия — 38% от неё, 2462 после округления
    expect(digitsOf(lineWith(savingsContent.saving))).toContain('2462');
  });

  it('пустая сетка даёт нули и объясняет их', () => {
    render(<SavingsBlock defaultHours={[]} />);

    expect(totalHours()).toBe('0');
    expect(digitsOf(lineWith(savingsContent.usual))).toBe('0');
    expect(screen.getByText(savingsContent.empty)).toBeInTheDocument();
  });

  it('круглые сутки считаются по двадцати четырём часам', () => {
    render(<SavingsBlock defaultHours={[...Array(24).keys()]} />);

    expect(totalHours()).toBe('24');
    // 0,75 × 120 × 24 × 6,5 = 14040
    expect(digitsOf(lineWith(savingsContent.usual))).toContain('14040');
  });
});

describe('Экономия инвертора — сетка часов', () => {
  it('в сетке двадцать четыре ячейки, и каждая знает своё состояние', () => {
    render(<SavingsBlock />);

    const cells = hourCells();

    expect(cells).toHaveLength(24);
    expect(cellAt(12)).toHaveAttribute('aria-pressed', 'true');
    expect(cellAt(3)).toHaveAttribute('aria-pressed', 'false');
  });

  it('у ячейки внятное имя, ночная зона названа', () => {
    render(<SavingsBlock />);

    expect(cellAt(3)).toHaveAccessibleName('03:00–04:00, ночная зона, выключен');
    expect(cellAt(12)).toHaveAccessibleName('12:00–13:00, включён');
  });

  it('клик по ячейке добавляет час, повторный — снимает', () => {
    render(<SavingsBlock />);

    fireEvent.click(cellAt(8));
    expect(totalHours()).toBe('9');
    // 0,75 × 120 × 9 × 6,5 = 5265
    expect(digitsOf(lineWith(savingsContent.usual))).toContain('5265');

    fireEvent.click(cellAt(8));
    expect(totalHours()).toBe('8');
  });

  it('ячейка переключается с клавиатуры — пробелом и Enter', async () => {
    const user = userEvent.setup();
    render(<SavingsBlock />);

    cellAt(9).focus();
    await user.keyboard('{Enter}');
    expect(cellAt(9)).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard(' ');
    expect(cellAt(9)).toHaveAttribute('aria-pressed', 'false');
  });

  it('протяжка мышью красит соседние ячейки', () => {
    render(<SavingsBlock defaultHours={[]} />);

    pointerEvent('pointerdown', cellAt(10));
    pointerEvent('pointerover', cellAt(11));
    pointerEvent('pointerover', cellAt(12));

    expect(totalHours()).toBe('3');
  });

  it('после отпускания кнопки протяжка прекращается', () => {
    render(<SavingsBlock defaultHours={[]} />);

    pointerEvent('pointerdown', cellAt(10));
    fireEvent.mouseUp(window);
    pointerEvent('pointerover', cellAt(11));

    expect(totalHours()).toBe('1');
  });

  it('на сенсорном экране нажатие ничего не красит — работает обычный клик', () => {
    render(<SavingsBlock defaultHours={[]} />);

    pointerEvent('pointerdown', cellAt(10), 'touch');
    pointerEvent('pointerover', cellAt(11), 'touch');
    expect(totalHours()).toBe('0');

    fireEvent.click(cellAt(10));
    expect(totalHours()).toBe('1');
  });

  it('сумма часов объявляется скринридеру', () => {
    render(<SavingsBlock />);

    const live = totalOutput();

    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveAccessibleName(savingsContent.gridTotalLabel);
  });
});

describe('Экономия инвертора — тариф день и ночь', () => {
  it('переключение на «День / ночь» включает ночную ставку', () => {
    render(<SavingsBlock />);

    fireEvent.click(screen.getByRole('button', { name: savingsContent.modeDual }));

    expect(screen.getByLabelText(savingsContent.tariffNight)).toBeEnabled();
    expect(screen.getByLabelText(savingsContent.tariffDayDual)).toBeInTheDocument();
  });

  it('ночные часы считаются по ночной ставке', () => {
    // четыре ночных часа и четыре дневных
    render(<SavingsBlock defaultHours={[0, 1, 2, 3, 12, 13, 14, 15]} defaultTariffMode="dual" />);

    // 0,75 × 120 × (4 × 6,5 + 4 × 3,1) = 90 × 38,4 = 3456
    expect(digitsOf(lineWith(savingsContent.usual))).toContain('3456');
  });

  it('кнопки режима сообщают, какой из них выбран', () => {
    render(<SavingsBlock />);

    const single = screen.getByRole('button', { name: savingsContent.modeSingle });
    const dual = screen.getByRole('button', { name: savingsContent.modeDual });

    expect(single).toHaveAttribute('aria-pressed', 'true');
    expect(dual).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(dual);

    expect(single).toHaveAttribute('aria-pressed', 'false');
    expect(dual).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Экономия инвертора — честность цифр', () => {
  it('ночной ползунок в едином тарифе выключен для голоса, а не только визуально', () => {
    render(<SavingsBlock />);
    // Подпись содержит скобки, поэтому ищем не по имени, а по сути:
    // в едином тарифе ровно один из двух ползунков должен быть выключен.
    const sliders = screen.getAllByRole('slider');
    expect(sliders.filter((el) => (el as HTMLInputElement).disabled)).toHaveLength(1);
  });

  it('у блока есть оговорка про приблизительность расчёта', () => {
    render(<SavingsBlock />);

    const disclaimer = screen.getByText(savingsContent.disclaimer);

    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer.textContent).toMatch(/не расчёт по счётчику/);
    expect(disclaimer.textContent).toMatch(/зависит от режима работы/);
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
