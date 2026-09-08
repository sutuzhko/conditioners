import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PasswordInput } from './PasswordInput';

const SHOW = 'Показать пароль';
const HIDE = 'Скрыть пароль';

describe('PasswordInput', () => {
  it('по умолчанию поле скрыто', () => {
    render(<PasswordInput label="Пароль" />);

    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: SHOW })).toHaveAttribute('aria-pressed', 'false');
  });

  it('нажатие показывает символы, имя кнопки и aria-pressed меняются', async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Пароль" />);

    await user.click(screen.getByRole('button', { name: SHOW }));

    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'text');
    const button = screen.getByRole('button', { name: HIDE });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(button);
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: SHOW })).toHaveAttribute('aria-pressed', 'false');
  });

  it('кнопка связана с полем: aria-controls указывает на его id', () => {
    render(<PasswordInput label="Пароль" />);

    const input = screen.getByLabelText('Пароль');
    expect(screen.getByRole('button', { name: SHOW })).toHaveAttribute(
      'aria-controls',
      input.getAttribute('id'),
    );
  });

  /* 🔴 Показ читают, чтобы дописать пароль. Каретка обязана остаться в поле:
     Safari на macOS кнопкам фокус по нажатию не даёт, и без этого нажатие
     выглядело бы уходом из группы — показ гас бы в момент включения. */
  it('нажатие на кнопку не уводит фокус из поля', async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Пароль" />);

    const input = screen.getByLabelText('Пароль');
    await user.click(input);
    await user.click(screen.getByRole('button', { name: SHOW }));

    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('🔴 отправка формы возвращает точки', async () => {
    const user = userEvent.setup();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <PasswordInput label="Пароль" />
        <button type="submit">Войти</button>
      </form>,
    );

    await user.click(screen.getByRole('button', { name: SHOW }));
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
  });

  it('🔴 уход фокуса со всей группы возвращает точки', async () => {
    const user = userEvent.setup();
    render(
      <>
        <PasswordInput label="Пароль" />
        <button type="button">Соседняя кнопка</button>
      </>,
    );

    /* 🔴 Показ включается мышью, не тронув поля: пароль подставил менеджер, и
       фокуса внутри группы до этого не было ни у чего. Уходить всё равно
       обязано — поэтому нажатие само ставит каретку в поле. */
    await user.click(screen.getByRole('button', { name: SHOW }));
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Пароль')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Соседняя кнопка' }));
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
  });

  /* Переход между полем и кнопкой показа — не уход: иначе показ гас бы от
     табуляции на ту самую кнопку, которая его включает. */
  it('табуляция с поля на кнопку показ не гасит', async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Пароль" />);

    await user.click(screen.getByRole('button', { name: SHOW }));
    await user.click(screen.getByLabelText('Пароль'));
    await user.tab();

    expect(screen.getByRole('button', { name: HIDE })).toHaveFocus();
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'text');
  });

  it('🔴 Escape возвращает точки и не гасится: окну достаётся тот же Escape', async () => {
    const user = userEvent.setup();
    let outside = 0;
    render(
      <div
        onKeyDown={(event) => {
          if (event.key === 'Escape') outside += 1;
        }}
      >
        <PasswordInput label="Пароль" />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: SHOW }));
    await user.click(screen.getByLabelText('Пароль'));
    await user.keyboard('{Escape}');

    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
    expect(outside).toBe(1);
  });

  /* 🔴 Открытый пароль живёт только в свойстве поля. Второй узел с тем же
     текстом или атрибут `value` в разметке — это пароль, попавший в DOM
     открытым: его увидит и расширение браузера, и снимок страницы. */
  it('🔴 значение не уезжает в разметку ни скрытым, ни показанным', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordInput label="Пароль" />);

    const input = screen.getByLabelText('Пароль');
    await user.type(input, 'Секрет-42');
    await user.click(screen.getByRole('button', { name: SHOW }));

    expect(input).toHaveValue('Секрет-42');
    expect(container.innerHTML).not.toContain('Секрет-42');
  });

  /**
   * 🔴 Показ не добавляет в разметку **второй** копии значения — ни узла, ни
   * атрибута. Больше показ и не может: атрибут `value` управляемому полю
   * пишет сам React, и пишет его любому полю, а не только этому.
   *
   * Замерено: `<PasswordInput value="Секрет-42" onChange={…}>` даёт в DOM
   * `<input type="password" value="Секрет-42">` — то же самое даёт и обычный
   * `Input`, которым форма входа набрана сегодня. Снимать атрибут после
   * отрисовки бесполезно: React возвращает его при восстановлении состояния
   * управляемого поля, уже после эффектов, — проверено, тест на это падал на
   * первом же нажатии клавиши.
   *
   * Закрыть это можно только сняв поле с управления React, а это решение
   * уровня кита целиком, не одного компонента. Здесь тест сторожит то, за что
   * отвечает показ: своей копии значения он не заводит.
   */
  it('🔴 показ не заводит второй копии значения в разметке', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PasswordInput label="Пароль" value="Секрет-42" onChange={() => undefined} />,
    );

    const input = screen.getByLabelText('Пароль');
    await user.click(screen.getByRole('button', { name: SHOW }));

    expect(input).toHaveAttribute('type', 'text');

    const carriers = [...container.querySelectorAll('*')].filter(
      (node) =>
        node !== input &&
        (node.textContent?.includes('Секрет-42') === true ||
          [...node.attributes].some((attribute) => attribute.value.includes('Секрет-42'))),
    );

    expect(carriers).toEqual([]);
  });

  it('автозаполнение и подсказки менеджера паролей не сбрасываются показом', async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Пароль" name="password" autoComplete="current-password" />);

    const input = screen.getByLabelText('Пароль');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(input).toHaveAttribute('name', 'password');

    await user.click(screen.getByRole('button', { name: SHOW }));
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(input).toHaveAttribute('name', 'password');
  });

  it('ошибка помечает поле и озвучивается', () => {
    render(<PasswordInput label="Пароль" error="Не меньше 12 знаков" />);

    const input = screen.getByLabelText('Пароль');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Не меньше 12 знаков');
  });

  it('отключённое поле гасит и кнопку показа', () => {
    render(<PasswordInput label="Пароль" disabled />);

    expect(screen.getByLabelText('Пароль')).toBeDisabled();
    expect(screen.getByRole('button', { name: SHOW })).toBeDisabled();
  });

  /* 🔴 Тест на CSS, а не на разметку: jsdom модули не применяет, а тап-зона —
     это правило в файле стилей. Псевдоэлементом её здесь не добирают
     намеренно: рамка кнопки и есть цель, и её видит любой измеритель. */
  it('🔴 до 900px кнопка показа — цель 44×44, и добрана она размером, а не ::after', () => {
    const css = readFileSync(join(__dirname, 'PasswordInput.module.css'), 'utf8');

    expect(css).toContain('@media (width < 900px)');
    expect(css).toContain('width: var(--tap)');
    expect(css).not.toContain('::after');
  });
});
