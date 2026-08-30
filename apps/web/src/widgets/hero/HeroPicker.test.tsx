import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { forgetLeadContext, readLeadContext } from '@/features/lead-form';

import { pickerContent as t } from './content';
import { HeroPicker } from './HeroPicker';
import { discountedPickerModels, heroPickerModels, saleNow, weakPickerModels } from './fixtures';

/**
 * Карточка подбора: три состояния результата и переключатели над ними.
 *
 * 🔴 Равную высоту состояний здесь не проверить: jsdom не считает раскладку, а
 * CSS-модули в нём не применяются вовсе. Поэтому тесты держат то, **чем**
 * высота обеспечена, — что все три состояния лежат в разметке всегда, что
 * спрятанные не попадают ни в дерево доступности, ни во взаимодействие, и что
 * правила, которые это делают, стоят в модуле стилей. Сама координата кнопки
 * меряется в браузере (docs/CLAUDE.md, «Прыжок вёрстки проверяется
 * измерением»).
 */

/** Все три состояния панели — дети живой области. */
const states = (): readonly HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[aria-live="polite"] > div'));

/** Показанное состояние: единственное без пометки о скрытии. */
const shown = (): HTMLElement => {
  const box = states().find((item) => !item.hasAttribute('data-hidden'));
  if (box === undefined) throw new Error('видимого состояния в панели нет');

  return box;
};

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'HeroPicker.module.css'),
  'utf8',
);

describe('Подбор — три состояния одной высоты', () => {
  it('🔴 все три состояния лежат в разметке всегда: на этом держится высота', () => {
    render(<HeroPicker products={heroPickerModels} leadHref="#lead" now={saleNow} />);

    expect(states()).toHaveLength(3);
    expect(states().filter((item) => item.hasAttribute('data-hidden'))).toHaveLength(2);
  });

  it('🔴 спрятанное состояние не слышно читалке и не ловит фокус', () => {
    render(<HeroPicker products={heroPickerModels} leadHref="#lead" now={saleNow} />);

    for (const box of states().filter((item) => item.hasAttribute('data-hidden'))) {
      expect(box).toHaveAttribute('aria-hidden', 'true');
      expect(box).toHaveAttribute('inert');
    }

    expect(shown()).not.toHaveAttribute('aria-hidden');
    expect(shown()).not.toHaveAttribute('inert');
  });

  /**
   * 🔴 Урок ADR-159: тест, который не может упасть, хуже отсутствующего. Правила
   * ниже — единственное, чем держится равная высота, а jsdom их не применяет,
   * значит проверяем источник.
   */
  it('🔴 спрятанное состояние занимает своё место, а кнопка прижата к низу', () => {
    expect(css).toMatch(/\.state\[data-hidden\]\s*\{[^}]*visibility:\s*hidden/);
    expect(css).toMatch(/\.cta\.cta\s*\{[^}]*margin-top:\s*auto/);
    expect(css).toMatch(/\.state\s*\{[^}]*grid-area:\s*1\s*\/\s*1/);
  });

  it('модель подобрана: название, цена и кнопка сметы на эту модель', () => {
    render(<HeroPicker products={heroPickerModels} leadHref="#lead" now={saleNow} />);

    const box = within(shown());
    expect(box.getByRole('heading', { level: 3 })).toHaveTextContent('Сплит-система 09');
    expect(box.getByRole('link', { name: t.order })).toBeInTheDocument();
  });

  it('идёт пересчёт: скелетоны вместо данных и кнопка на месте', () => {
    render(<HeroPicker products={heroPickerModels} leadHref="#lead" now={saleNow} pending />);

    const box = within(shown());
    /* 🔴 Кнопка не пропадает и не теряет имени: `visibility` убрал бы её из
       дерева доступности, и читалка объявила бы безымянную кнопку (ADR-159). */
    const cta = box.getByRole('button', { name: t.order });
    expect(cta).toBeDisabled();

    expect(box.queryByRole('heading')).toBeNull();
    expect(shown().textContent).toContain(t.pendingNote);
  });

  it('🔴 скелетон занимает столько же, сколько данные, которые заменяет', () => {
    render(<HeroPicker products={heroPickerModels} leadHref="#lead" now={saleNow} pending />);

    const bars = Array.from(shown().querySelectorAll<HTMLElement>('span[aria-hidden="true"]'))
      .map((bar) => `${bar.style.width}×${bar.style.height}`)
      .filter((size) => size !== '×');

    /* Числа — из макета: пилюля класса, миниатюра, название, характеристики,
       цена. Скелетон не той высоты — это тот же прыжок, только отложенный. */
    expect(bars).toEqual(['34px×18px', '62px×62px', '210px×22px', '160px×14px', '140px×30px']);
  });

  it('🔴 подходящей модели нет: разговор вместо цены', () => {
    render(<HeroPicker products={weakPickerModels} leadHref="#lead" now={saleNow} />);

    const box = within(shown());
    expect(box.getByRole('heading', { level: 3 })).toHaveTextContent(t.noFitTitle(25));
    expect(box.getByRole('link', { name: t.noFitCta })).toBeInTheDocument();
    /* Цены здесь нет и быть не может: такую схему считают по месту, а
       показанное на сайте обязано совпасть с тем, что скажут по телефону. */
    expect(shown().textContent).not.toContain('₽');
  });

  it('🔴 модель послабее не выдаётся за подходящую: ползунок увёл площадь за каталог', () => {
    render(<HeroPicker products={heroPickerModels} leadHref="#lead" now={saleNow} />);
    /* Самая мощная модель каталога закрывает 50 м². На 58 `pickByArea` честно
       отдаёт именно её (docs/PROJECT.md §2.3) — а карточка обязана не выдавать
       её за подходящую. */
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });
    expect(within(shown()).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Сплит-система 18',
    );

    fireEvent.change(screen.getByRole('slider'), { target: { value: '58' } });

    expect(within(shown()).getByRole('heading', { level: 3 })).toHaveTextContent(t.noFitTitle(58));
  });

  it('пустой каталог — не одно из трёх состояний, а другая карточка', () => {
    render(<HeroPicker products={[]} leadHref="#lead" />);

    expect(states()).toHaveLength(0);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.emptyCta })).toBeInTheDocument();
  });
});

describe('Подбор — что уезжает с заявкой', () => {
  beforeEach(() => {
    forgetLeadContext();
  });

  it('🔴 без подходящей модели в снимок уходит площадь и помещение, а модели нет', async () => {
    const user = userEvent.setup();
    render(<HeroPicker products={weakPickerModels} leadHref="#lead" now={saleNow} />);

    await user.click(screen.getByRole('link', { name: t.noFitCta }));

    const pick = readLeadContext()?.pick;
    expect(pick?.area).toBe(25);
    expect(pick?.place).toBe('Квартира');
    expect(pick?.model).toBeNull();
  });

  it('скидка попадает в снимок вместе с перечёркнутой ценой', async () => {
    const user = userEvent.setup();
    render(<HeroPicker products={discountedPickerModels} leadHref="#lead" now={saleNow} />);

    await user.click(screen.getByRole('link', { name: t.order }));

    expect(readLeadContext()?.pick?.model?.oldPrice).toBe(38500);
  });
});

describe('Подбор — тип помещения', () => {
  it('🔴 три чипа стоят одним рядом равными долями на телефоне', () => {
    /* Раскладка чипов — единственное, ради чего заведён блок 600px: перенос
       «Офиса» во второй ряд растил первый экран (issue #255). */
    expect(css).toMatch(
      /@media \(width < 600px\) \{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/,
    );
  });

  it('🔴 имя чипа для читалки не зависит от ширины экрана', () => {
    render(<HeroPicker products={heroPickerModels} leadHref="#lead" now={saleNow} />);

    const house = screen.getByRole('button', { name: 'Частный дом' });
    /* Видимая подпись на телефоне короче — «Дом», — и она входит в имя:
       WCAG «имя содержит видимую подпись» соблюдён обеими. */
    expect(house.textContent).toContain('Дом');
    expect(house.textContent).toContain('Частный дом');
  });

  it('тап-зона чипа не меньше 44px и без сенсорного экрана', () => {
    expect(css).toMatch(/\.placeChip\.placeChip\s*\{[^}]*min-height:\s*var\(--tap\)/);
  });
});
