import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RowMenu } from './RowMenu';
import { Tooltip } from '../Tooltip/Tooltip';

function setup() {
  const open = vi.fn();
  const cancel = vi.fn();

  render(
    <RowMenu
      label="Действия над нарядом № 1059"
      items={[
        { id: 'open', label: 'Открыть', onSelect: open },
        { id: 'print', label: 'Печать', onSelect: () => {} },
        { id: 'cancel', label: 'Отменить наряд', onSelect: cancel, danger: true },
      ]}
    />,
  );

  return {
    open,
    cancel,
    trigger: screen.getByRole('button', { name: 'Действия над нарядом № 1059' }),
  };
}

describe('Меню строки', () => {
  it('кнопка названа и объявлена как открывающая меню', () => {
    const { trigger } = setup();

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('меню закрыто, пока его не открыли', () => {
    setup();

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('открывается нажатием', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();

    await user.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
  });

  it('стрелка вниз на кнопке открывает меню', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();

    trigger.focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('стрелки ведут по пунктам с переносом по кругу', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();

    await user.click(trigger);
    await user.keyboard('{ArrowUp}');

    /* Вверх с первого пункта ведёт на последний. */
    expect(screen.getAllByRole('menuitem')[2]?.className).toContain('active');
  });

  it('End прыгает на последний пункт, Home — на первый', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();

    await user.click(trigger);
    await user.keyboard('{End}');
    expect(screen.getAllByRole('menuitem')[2]?.className).toContain('active');

    await user.keyboard('{Home}');
    expect(screen.getAllByRole('menuitem')[0]?.className).toContain('active');
  });

  it('Enter выбирает подсвеченный пункт и закрывает меню', async () => {
    const user = userEvent.setup();
    const { trigger, open } = setup();

    await user.click(trigger);
    await user.keyboard('{Enter}');

    expect(open).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  /* 🔴 Esc закрывает меню и возвращает фокус на кнопку: иначе фокус остаётся
     на исчезнувшем узле и уезжает в начало документа. */
  it('Esc закрывает меню и возвращает фокус на кнопку', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('нажатие на пункт вызывает его действие', async () => {
    const user = userEvent.setup();
    const { trigger, cancel } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Отменить наряд' }));

    expect(cancel).toHaveBeenCalled();
  });

  it('отключённый пункт объявлен отключённым и не срабатывает', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <RowMenu
        label="Действия"
        items={[{ id: 'del', label: 'Удалить', onSelect, disabled: true }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Действия' }));
    const item = screen.getByRole('menuitem', { name: 'Удалить' });
    expect(item).toHaveAttribute('aria-disabled', 'true');

    await user.click(item);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

/**
 * 🔴 Раскладка умеет доезжать уже после открытия меню — подмена шрифта, поздняя
 * картинка, — и ни прокрутки, ни изменения размера окна при этом не
 * происходит (issue #660). Меню, посчитанное один раз, оставалось стоять мимо
 * своей кнопки.
 */
describe('Меню строки — положение', () => {
  it('🔴 едет за кнопкой, когда раскладка доезжает после открытия', async () => {
    const callbacks: ResizeObserverCallback[] = [];
    const original = globalThis.ResizeObserver;

    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        callbacks.push(callback);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };

    try {
      const { trigger } = setup();

      let top = 100;
      vi.spyOn(trigger, 'getBoundingClientRect').mockImplementation(
        () => new DOMRect(0, top, 32, 32),
      );

      await userEvent.click(trigger);
      const menu = screen.getByRole('menu');
      expect(menu.style.top).toBe('136px');

      /* Кнопка уехала вниз на 200px — ровно то, что делает подмена шрифта. */
      top = 300;
      /* Список слепком: наблюдатель, отданный обработчику, сам регистрирует
         ещё один — перебор живого списка не кончился бы никогда. */
      const observed = [...callbacks];
      const dummy = new globalThis.ResizeObserver(() => {});
      act(() => {
        for (const callback of observed) callback([], dummy);
      });

      expect(menu.style.top).toBe('336px');
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});

describe('Подсказка', () => {
  it('закрыта, пока на неё не навели и не встали фокусом', () => {
    render(
      <Tooltip text="Заказы за неделю">
        <button type="button">Обзор</button>
      </Tooltip>,
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('открывается наведением', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip text="Заказы за неделю">
        <button type="button">Обзор</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole('button', { name: 'Обзор' }));

    expect(screen.getByRole('tooltip')).toHaveTextContent('Заказы за неделю');
  });

  /* 🔴 WCAG 1.4.13: подсказка, появившаяся по указателю, обязана появляться и
     с клавиатуры — иначе половина способов ввода её не увидит вовсе. */
  it('открывается фокусом с клавиатуры', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip text="Заказы за неделю">
        <button type="button">Обзор</button>
      </Tooltip>,
    );

    await user.tab();

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('Esc убирает подсказку, не уводя фокус', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip text="Заказы за неделю">
        <button type="button">Обзор</button>
      </Tooltip>,
    );

    await user.tab();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обзор' })).toHaveFocus();
  });

  it('подсказка связана с тем, что подсказывает', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip text="Заказы за неделю">
        <button type="button">Обзор</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole('button', { name: 'Обзор' }));

    const tooltip = screen.getByRole('tooltip');
    const anchor = screen.getByRole('button', { name: 'Обзор' }).parentElement;
    expect(anchor).toHaveAttribute('aria-describedby', tooltip.id);
  });
});

/**
 * 🔴 Тот же дефект, что у меню строки, и та же проверка (issue #665).
 * Подсказка считала координаты один раз при открытии и слушала только
 * прокрутку и изменение размера окна — а подмена шрифта не даёт ни того, ни
 * другого: цель уезжала, пузырёк оставался стоять и указывал мимо своего
 * ярлыка.
 */
describe('Подсказка — положение', () => {
  it('🔴 едет за целью, когда раскладка доезжает после открытия', async () => {
    const callbacks: ResizeObserverCallback[] = [];
    const original = globalThis.ResizeObserver;

    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        callbacks.push(callback);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };

    try {
      const user = userEvent.setup();
      render(
        <Tooltip text="Заказы за неделю">
          <button type="button">Обзор</button>
        </Tooltip>,
      );

      const target = screen.getByRole('button', { name: 'Обзор' });
      const anchor = target.parentElement;
      if (anchor === null) throw new Error('у цели нет обёртки-якоря');

      let top = 200;
      vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
        () => new DOMRect(100, top, 40, 20),
      );

      await user.hover(target);
      expect(screen.getByRole('tooltip').style.top).toBe('192px');

      /* Цель уехала вниз на 200px — ровно то, что делает подмена шрифта. */
      top = 400;
      /* Список слепком: наблюдатель, отданный обработчику, сам регистрирует
         ещё один — перебор живого списка не кончился бы никогда. */
      const observed = [...callbacks];
      const dummy = new globalThis.ResizeObserver(() => {});
      act(() => {
        for (const callback of observed) callback([], dummy);
      });

      expect(screen.getByRole('tooltip').style.top).toBe('392px');
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});
