import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { defaultSymptoms, diagnosticsText } from './content';
import { Diagnostics } from './Diagnostics';
import { customSymptoms, symptomsWithPrices } from './fixtures';

/** Разбор симптома в разметке — видимый или скрытый, но всегда существующий. */
function panel(container: HTMLElement, key: string): HTMLElement {
  const found = container.querySelector<HTMLElement>(`[data-symptom="${key}"]`);
  if (found === null) throw new Error(`Разбора «${key}» нет в разметке`);
  return found;
}

/**
 * Показан ли разбор. Разборы лежат стопкой и не выпадают из потока (иначе
 * кнопка вызова мастера прыгала бы), поэтому «скрыт» — это `inert` и
 * `aria-hidden`, а не `display: none`; стиль `visibility` jsdom не считает.
 */
function shown(container: HTMLElement, key: string): boolean {
  const node = panel(container, key);
  return !node.hasAttribute('inert') && node.getAttribute('aria-hidden') !== 'true';
}

/**
 * Testing Library схлопывает пробелы, включая неразрывный из `formatMoney`.
 * Сравниваем с тем текстом, который видит человек.
 */
const visible = (text: string | null): string => (text ?? '').replace(/\u00A0/g, ' ');

function chip(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

describe('Сервис — диагностика по симптомам', () => {
  it('выбор чипа меняет разбор', async () => {
    const user = userEvent.setup();
    const { container } = render(<Diagnostics />);

    expect(shown(container, 'ne-holodit')).toBe(true);
    expect(shown(container, 'kapaet-voda')).toBe(false);

    await user.click(chip('Капает вода'));

    expect(shown(container, 'kapaet-voda')).toBe(true);
    expect(shown(container, 'ne-holodit')).toBe(false);
    expect(chip('Капает вода')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Не холодит')).toHaveAttribute('aria-pressed', 'false');
  });

  it('все разборы лежат в разметке независимо от выбора — это индексируемый текст', async () => {
    const user = userEvent.setup();
    const { container } = render(<Diagnostics />);

    const allSymptomsPresent = (): void => {
      expect(container.querySelectorAll('[data-symptom]')).toHaveLength(defaultSymptoms.length);
      for (const symptom of defaultSymptoms) {
        expect(screen.getByText(symptom.title)).toBeInTheDocument();
        expect(screen.getByText(symptom.causes)).toBeInTheDocument();
        expect(screen.getByText(symptom.fix)).toBeInTheDocument();
      }
    };

    allSymptomsPresent();
    await user.click(chip('Не включается'));
    allSymptomsPresent();
    expect(shown(container, 'ne-vklyuchaetsya')).toBe(true);
  });

  it('по чипам можно пройти с клавиатуры и выбрать симптом', async () => {
    const user = userEvent.setup();
    const { container } = render(<Diagnostics />);

    await user.tab();
    expect(chip('Не холодит')).toHaveFocus();

    await user.tab();
    expect(chip('Капает вода')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(shown(container, 'kapaet-voda')).toBe(true);

    await user.tab();
    expect(chip('Неприятный запах')).toHaveFocus();

    await user.keyboard(' ');
    expect(shown(container, 'zapah')).toBe(true);
    expect(shown(container, 'kapaet-voda')).toBe(false);
  });

  it('чипы собраны в группу с общей подписью', () => {
    render(<Diagnostics />);

    const group = screen.getByRole('group', { name: diagnosticsText.chipsLabel });
    expect(within(group).getAllByRole('button')).toHaveLength(defaultSymptoms.length);
  });

  it('смена симптома объявляется голосом', () => {
    const { container } = render(<Diagnostics />);

    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live?.querySelectorAll('[data-symptom]')).toHaveLength(defaultSymptoms.length);
  });

  it('открывается на симптоме, указанном пропсом', () => {
    const { container } = render(<Diagnostics defaultSymptom="obmerzaet" />);

    expect(shown(container, 'obmerzaet')).toBe(true);
    expect(chip('Обледенел')).toHaveAttribute('aria-pressed', 'true');
  });

  it('неизвестный ключ в пропсе не оставляет блок без разбора', () => {
    const { container } = render(<Diagnostics defaultSymptom="net-takogo" />);

    expect(shown(container, 'ne-holodit')).toBe(true);
  });

  it('🔴 скрытый разбор остаётся в потоке, но недоступен: inert и aria-hidden', () => {
    const { container } = render(<Diagnostics />);

    const hiddenPanel = panel(container, 'kapaet-voda');
    expect(hiddenPanel).toHaveAttribute('inert');
    expect(hiddenPanel).toHaveAttribute('aria-hidden', 'true');
    // не `hidden` и не размонтирование: узел держит высоту стопки
    expect(hiddenPanel).not.toHaveAttribute('hidden');
    expect(panel(container, 'ne-holodit')).not.toHaveAttribute('inert');
  });

  it('🔴 кнопка вызова мастера одна и стоит вне разборов — её место не зависит от выбора', async () => {
    const user = userEvent.setup();
    render(<Diagnostics />);

    const links = screen.getAllByRole('link', { name: diagnosticsText.cta });
    expect(links).toHaveLength(1);
    const link = links[0];
    expect(link).toBeDefined();
    expect(link?.closest('[data-symptom]')).toBeNull();

    // тот же узел на месте после перебора всех шести
    for (const symptom of defaultSymptoms) {
      await user.click(chip(symptom.label));
      expect(screen.getByRole('link', { name: diagnosticsText.cta })).toBe(link);
    }
  });

  it('🔴 короткая подпись чипа — часть полной: имя кнопки остаётся полным', () => {
    render(<Diagnostics />);

    for (const symptom of defaultSymptoms) {
      const button = chip(symptom.label);
      expect(button).toHaveAccessibleName(symptom.label);
      if (symptom.short === undefined) continue;

      // видимая на телефоне подпись входит в имя слово в слово (WCAG 2.5.3);
      // регистр не в счёт — голосовое управление его не различает
      expect(symptom.label.toLowerCase()).toContain(symptom.short.toLowerCase());
      expect(within(button).getByText(symptom.short)).toBeInTheDocument();
      expect(within(button).getByText(symptom.label)).toBeInTheDocument();
    }
  });
});

describe('Сервис — стоимость работ', () => {
  it('без данных снаружи в блоке нет ни одной цифры цены', () => {
    const { container } = render(<Diagnostics />);

    expect(screen.getAllByText(diagnosticsText.priceUnknown)).toHaveLength(defaultSymptoms.length);
    expect(container.textContent).not.toContain('₽');
  });

  it('переданную стоимость показывает как «от N ₽»', () => {
    const { container } = render(<Diagnostics symptoms={symptomsWithPrices} />);

    expect(visible(panel(container, 'ne-holodit').textContent)).toContain('от 1 500 ₽');
    expect(visible(panel(container, 'ne-vklyuchaetsya').textContent)).toContain('от 900 ₽');
  });

  it('симптом без цены в списке с ценами остаётся с формулировкой без цифры', () => {
    const { container } = render(<Diagnostics symptoms={customSymptoms} />);

    expect(visible(panel(container, 'ne-greet').textContent)).toContain('от 2 400 ₽');
    expect(panel(container, 'techet-naruzhnyy').textContent).toContain(
      diagnosticsText.priceUnknown,
    );
  });
});

describe('Сервис — вызов мастера', () => {
  it('🔴 кнопка приносит к форме тему сервиса, а не монтажа (ADR-129)', () => {
    render(<Diagnostics />);

    expect(screen.getByRole('link', { name: diagnosticsText.cta })).toHaveAttribute(
      'href',
      '/?topic=service#lead',
    );
  });

  it('🔴 та же тема уезжает и из пустого состояния: выхода без предмета нет', () => {
    render(<Diagnostics symptoms={[]} />);

    expect(screen.getByRole('link', { name: diagnosticsText.cta })).toHaveAttribute(
      'href',
      '/?topic=service#lead',
    );
  });

  it('пустой список симптомов не превращается в пустую карточку без выхода', () => {
    const { container } = render(<Diagnostics symptoms={[]} />);

    expect(screen.getByText(diagnosticsText.emptyTitle)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-symptom]')).toHaveLength(0);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: diagnosticsText.cta })).toBeInTheDocument();
  });

  it('заголовок секции — h2, разборы — h3: уровни не перепрыгивают', () => {
    render(<Diagnostics />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(diagnosticsText.title);
    // в дереве доступности видны только заголовки показанного разбора
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });
});
