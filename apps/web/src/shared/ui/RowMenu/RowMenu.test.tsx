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
 * Кадр браузера в jsdom: `requestAnimationFrame` там живой, и один его тик —
 * ровно то, что делает хук в настоящем браузере.
 */
async function nextFrame(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      requestAnimationFrame(() => resolve(undefined));
    });
  });
}

/**
 * 🔴 Якорь умеет переехать, не изменившись в размере (issue #683): доехавшая
 * таблица стилей, поздняя картинка, раскрывшийся соседний блок. Ни прокрутки,
 * ни изменения окна, ни срабатывания `ResizeObserver` при этом нет — а меню,
 * посчитанное один раз, оставалось стоять мимо своей кнопки. Поэтому проверка
 * двигает кнопку и не подаёт **ни одного** события: положение обязано
 * выправиться от самого кадра.
 */
describe('Меню строки — положение', () => {
  it('🔴 встаёт у кнопки сразу, до первого кадра', async () => {
    const { trigger } = setup();

    vi.spyOn(trigger, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 100, 32, 32),
    );

    await userEvent.click(trigger);

    expect(screen.getByRole('menu').style.top).toBe('136px');
  });

  it('🔴 едет за кнопкой, когда та переехала без единого события', async () => {
    const { trigger } = setup();

    let top = 100;
    vi.spyOn(trigger, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, top, 32, 32),
    );

    await userEvent.click(trigger);
    const menu = screen.getByRole('menu');
    expect(menu.style.top).toBe('136px');

    /* Кнопка уехала вниз на 200px — ровно то, что делает доехавшая раскладка. */
    top = 300;
    await nextFrame();

    expect(menu.style.top).toBe('336px');
  });

  /* 🔴 Сторона — решение, а не координата (issue #689). Меню, у которого внизу
     не хватило места, раскрывается вверх, но размеры его от этого не меняются,
     а корень портала в измерениях пишется нулями (ADR-327). Атрибут — то
     единственное, чем переворот виден и в диффе PR, и в стилях. */
  it('🔴 называет сторону раскрытия атрибутом', async () => {
    const { trigger } = setup();

    vi.spyOn(trigger, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 100, 32, 32),
    );
    await userEvent.click(trigger);

    expect(screen.getByRole('menu')).toHaveAttribute('data-side', 'bottom');
  });

  it('🔴 у нижней строки окна меню уходит вверх и говорит об этом', async () => {
    const { trigger } = setup();

    /* Кнопка у самого низа окна jsdom (768px): места под меню нет. */
    vi.spyOn(trigger, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 734, 32, 32),
    );
    await userEvent.click(trigger);

    expect(screen.getByRole('menu')).toHaveAttribute('data-side', 'top');
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
 * 🔴 Тот же дефект и та же проверка, что у меню строки (issue #683).
 * Подсказка считала координаты один раз при открытии, и переехавшая цель
 * оставляла пузырёк указывать мимо своего ярлыка.
 */
describe('Подсказка — положение', () => {
  it('🔴 едет за целью, когда та переехала без единого события', async () => {
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

    /* Цель уехала вниз на 200px — ровно то, что делает доехавшая раскладка. */
    top = 400;
    await nextFrame();

    expect(screen.getByRole('tooltip').style.top).toBe('392px');
  });

  /* ---------- Пункты-ссылки и второй уровень (issue #744, ADR-351) ---------- */

  /** Строка списка людей: открыть — маршрут, позвонить — `tel:`, копировать —
      второй уровень. Тот же набор у клиентов и у монтажников (issue #745). */
  function people() {
    const copyPhone = vi.fn();
    const remove = vi.fn();

    render(
      <RowMenu
        label="Действия над клиентом «Соколова»"
        items={[
          { id: 'open', label: 'Открыть карточку', href: { pathname: '/admin/clients/1' } },
          { id: 'call', label: 'Позвонить', anchor: 'tel:+79101552468' },
          {
            id: 'copy',
            label: 'Скопировать',
            items: [
              { id: 'copy-phone', label: 'Телефон', onSelect: copyPhone },
              { id: 'copy-name', label: 'Имя', onSelect: () => {} },
            ],
          },
          { id: 'remove', label: 'Удалить клиента', onSelect: remove, danger: true },
        ]}
      />,
    );

    return {
      copyPhone,
      remove,
      trigger: screen.getByRole('button', { name: 'Действия над клиентом «Соколова»' }),
    };
  }

  /* 🔴 Ссылка обязана быть ссылкой в разметке: переход в обработчике браузер
     не видит — ни средней кнопкой, ни контекстным меню его не повторить, а
     `tel:` на рабочем столе просто уводил со страницы в никуда (issue #744). */
  it('🔴 «Открыть» и «Позвонить» — настоящие ссылки, а не обработчики', async () => {
    const user = userEvent.setup();
    const { trigger } = people();

    await user.click(trigger);

    expect(screen.getByRole('menuitem', { name: 'Открыть карточку' })).toHaveAttribute(
      'href',
      '/admin/clients/1',
    );
    expect(screen.getByRole('menuitem', { name: 'Позвонить' })).toHaveAttribute(
      'href',
      'tel:+79101552468',
    );
  });

  /* 🔴 Ссылка внутри меню не становится своей остановкой табуляции: модель
     меню — одна остановка на всё, подсвеченный пункт объявляется через
     `aria-activedescendant`. */
  it('🔴 пункт-ссылка не добавляет остановки табуляции', async () => {
    const user = userEvent.setup();
    const { trigger } = people();

    await user.click(trigger);

    expect(screen.getByRole('menuitem', { name: 'Открыть карточку' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('«Скопировать» открывает второй уровень с полями строки', async () => {
    const user = userEvent.setup();
    const { trigger } = people();

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Скопировать' }));

    expect(screen.getByRole('menuitem', { name: 'Телефон' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Имя' })).toBeInTheDocument();
    /* Первый уровень заменён, а не дополнен: иначе на 390 меню не помещалось
       бы в окно. */
    expect(screen.queryByRole('menuitem', { name: 'Удалить клиента' })).not.toBeInTheDocument();
  });

  it('выбор поля второго уровня копирует и закрывает меню', async () => {
    const user = userEvent.setup();
    const { trigger, copyPhone } = people();

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Скопировать' }));
    await user.click(screen.getByRole('menuitem', { name: 'Телефон' }));

    expect(copyPhone).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  /* 🔴 Возврат — такой же пункт списка, а не крестик сбоку: до пункта, куда
     не доезжают стрелки, клавиатура не добирается вовсе, а `role="menuitem"`
     на нём обещал бы обратное. */
  it('🔴 со второго уровня возвращает пункт «Назад», и стрелки до него доезжают', async () => {
    const user = userEvent.setup();
    const { trigger } = people();

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Скопировать' }));

    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('aria-activedescendant', expect.stringContaining('__back'));

    await user.click(screen.getByRole('menuitem', { name: 'Назад' }));

    expect(screen.getByRole('menuitem', { name: 'Удалить клиента' })).toBeInTheDocument();
  });

  it('стрелка вправо входит во второй уровень, влево возвращает', async () => {
    const user = userEvent.setup();
    const { trigger } = people();

    await user.click(trigger);
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}');

    expect(screen.getByRole('menuitem', { name: 'Телефон' })).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');

    expect(screen.getByRole('menuitem', { name: 'Удалить клиента' })).toBeInTheDocument();
  });

  /* 🔴 Esc на втором уровне возвращает, а не закрывает: закрытие всего меню
     отняло бы у человека и выбор поля, и место, откуда он в него зашёл. */
  it('🔴 Esc со второго уровня возвращает на первый, и только второй Esc закрывает', async () => {
    const user = userEvent.setup();
    const { trigger } = people();

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Скопировать' }));

    await user.keyboard('{Escape}');
    expect(screen.getByRole('menuitem', { name: 'Удалить клиента' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  /* 🔴 Подсказка у верхней строки таблицы переворачивается вниз, и это
     единственное, чем стороны различаются: размеры пузырька одинаковы, а
     координаты корня портала измерения не пишут (ADR-327, issue #689). */
  it('🔴 называет сторону раскрытия атрибутом и переворачивается у края окна', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip text="Заказы за неделю">
        <button type="button">Обзор</button>
      </Tooltip>,
    );

    const target = screen.getByRole('button', { name: 'Обзор' });
    const anchor = target.parentElement;
    if (anchor === null) throw new Error('у цели нет обёртки-якоря');

    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(100, 200, 40, 20),
    );
    await user.hover(target);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-side', 'top');

    await user.unhover(target);

    /* Цель прижата к верхнему краю окна — сверху пузырьку места нет. */
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(() => new DOMRect(100, 2, 40, 20));
    await user.hover(target);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-side', 'bottom');
  });
});
