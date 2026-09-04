import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

const open = (props: Partial<Parameters<typeof Modal>[0]> = {}) =>
  render(
    <Modal open onClose={props.onClose ?? (() => {})} title="Заявка принята" {...props}>
      <p>Перезвоним в течение 15 минут</p>
    </Modal>,
  );

describe('Modal', () => {
  it('закрытое окно не попадает в разметку', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Заявка принята">
        <p>Текст</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('имеет доступное имя из заголовка', () => {
    open();
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Заявка принята');
  });

  it('пояснение попадает в описание окна', () => {
    open({ description: 'Номер заявки 128' });
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Номер заявки 128');
  });

  it('закрывается по Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    open({ onClose });

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('закрывается кликом по подложке, но не по самому окну', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    open({ onClose });

    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay !== null) await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('закрывается кнопкой в шапке', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    open({ onClose });

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('фокус уходит внутрь окна при открытии', () => {
    open();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('по умолчанию фокус на крестике: действие по умолчанию — отказ', () => {
    open();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Закрыть' }));
  });

  /**
   * 🔴 Окно, существующее ради ввода, обязано открываться с фокусом в поле:
   * иначе человек с клавиатуры сначала попадает на крестик и тычет табом.
   *
   * Пометка атрибутом, а не пропом `autoFocus`: React выводит его не в DOM, а
   * фокусирует узел сам — и эффект окна успевал забрать фокус обратно.
   */
  it('поле с data-autofocus забирает фокус себе', () => {
    render(
      <Modal open onClose={() => {}} title="Отклонить отзыв">
        <textarea data-autofocus aria-label="Причина отказа" />
      </Modal>,
    );

    expect(document.activeElement).toBe(screen.getByLabelText('Причина отказа'));
  });

  /**
   * 🔴 Человек с клавиатуры, закрыв окно, обязан вернуться туда, откуда его
   * открыл. Иначе он оказывается в начале страницы и заново идёт табом до
   * нужной кнопки — а на странице панели их десятки.
   *
   * Ломалось порядком очисток: возврат фокуса стоял в эффекте выше снятия
   * `inert` с фона, а `focus()` внутри `inert`-поддерева браузер игнорирует.
   * Молча: окно закрывалось, ошибок не было, фокус просто уходил на `body`.
   */
  it('после закрытия фокус возвращается на открывшую кнопку', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Открыть';
    document.body.append(opener);
    opener.focus();

    const view = render(
      <Modal open onClose={() => {}} title="Заявка принята">
        <p>Текст</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    view.rerender(
      <Modal open={false} onClose={() => {}} title="Заявка принята">
        <p>Текст</p>
      </Modal>,
    );

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('Tab не уводит фокус за пределы окна', async () => {
    const user = userEvent.setup();
    open();

    const dialog = screen.getByRole('dialog');
    await user.tab();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('прокрутка страницы блокируется, пока окно открыто', () => {
    const { unmount } = open();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('фон помечен inert, а само окно — нет; закрытие снимает пометку', () => {
    // страница под окном: без inert виртуальный курсор читалки уходил бы в неё
    const page = document.createElement('p');
    page.textContent = 'Контент страницы';
    document.body.append(page);

    const { unmount } = open();

    expect(page).toHaveAttribute('inert');
    // корень портала — прямой ребёнок body, внутри которого живёт окно
    expect(screen.getByRole('dialog').parentElement).not.toHaveAttribute('inert');

    unmount();
    expect(page).not.toHaveAttribute('inert');
    page.remove();
  });

  /* 🔴 Клик по подложке уводит фокус на `body`, и прежняя ловушка в этот
     момент переставала держать: она срабатывала, только когда фокус стоял
     ровно на первом или последнем элементе окна. То есть в самом частом
     случае Tab уходил гулять по странице под окном (ADR-159). */
  it('🔴 Tab возвращает фокус в окно, даже когда он оказался снаружи', async () => {
    const user = userEvent.setup();
    open();

    const dialog = screen.getByRole('dialog');

    /* Окно уводит фокус внутрь при открытии, поэтому «снаружи» приходится
       воспроизвести: снятый фокус уходит на body — ровно так же, как после
       клика по подложке. */
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    expect(dialog.contains(document.activeElement)).toBe(false);

    await user.tab();

    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  /* Скрытое в ловушку не попадает: браузер не ставит на него фокус, и
     «последним» элементом оказывалось то, чего на экране нет. */
  it('🔴 спрятанные элементы не считаются границами ловушки', async () => {
    const user = userEvent.setup();
    render(
      <Modal open onClose={() => {}} title="Заявка принята">
        <button type="button">Первая</button>
        <button type="button" hidden>
          Спрятанная
        </button>
      </Modal>,
    );

    const visible = screen.getByRole('button', { name: 'Первая' });
    visible.focus();

    await user.tab();

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toHaveTextContent('Спрятанная');
  });

  it('чужой inert закрытие не трогает: снимается только своя пометка', () => {
    const parked = document.createElement('div');
    parked.setAttribute('inert', '');
    document.body.append(parked);

    const { unmount } = open();
    unmount();

    expect(parked).toHaveAttribute('inert');
    parked.remove();
  });
});
