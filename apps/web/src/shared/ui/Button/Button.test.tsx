import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, type ButtonVariant } from './Button';

describe('Button', () => {
  it('по умолчанию не отправляет форму — type=button', () => {
    render(<Button>Отправить</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('вызывает обработчик по клику и по Enter с клавиатуры', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Заказать</Button>);

    await user.tab();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Заказать' }));

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('в состоянии загрузки блокируется и помечается aria-busy', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button loading onClick={onClick}>
        Отправляем
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('подпись остаётся в разметке при загрузке — ширина кнопки не скачет', () => {
    render(<Button loading>Отправляем</Button>);
    expect(screen.getByRole('button', { name: 'Отправляем' })).toBeInTheDocument();
  });

  /* 🔴 Этот тест проверяет CSS, а не разметку, и это не причуда (ADR-159).
     Содержимое пряталось `visibility: hidden`, а он убирает поддерево и из
     дерева доступности: в браузере у кнопки на время отправки не оставалось
     имени вовсе — читалка объявляла безымянную «кнопку, занято» ровно в
     момент отправки заявки. Тест выше при этом был зелёным: jsdom не
     применяет CSS-модули и подмены не видел. Поэтому проверяется сам
     источник — правило в файле стилей. */
  it('🔴 содержимое при загрузке прячется прозрачностью, а не visibility', () => {
    const css = readFileSync(join(__dirname, 'Button.module.css'), 'utf8');
    const loadingContent = css.slice(css.indexOf('.loading .content'));
    const rule = loadingContent.slice(0, loadingContent.indexOf('}'));

    expect(rule).toContain('opacity: 0');
    expect(rule).not.toContain('visibility');
  });

  it('отключённая кнопка не реагирует на клик', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={onClick}>
        Недоступно
      </Button>,
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('пробрасывает произвольные атрибуты кнопки', () => {
    render(<Button aria-label="Позвонить" name="call" />);
    expect(screen.getByRole('button', { name: 'Позвонить' })).toHaveAttribute('name', 'call');
  });
  it('каждый из семи вариантов даёт свой класс — заливки не совпадают', () => {
    const variants: readonly ButtonVariant[] = [
      'solid',
      'flat',
      'bordered',
      'faded',
      'light',
      'ghost',
      'danger',
    ];

    const classes = variants.map(
      (variant) =>
        render(<Button variant={variant}>Заказать</Button>).container.firstElementChild?.className,
    );

    expect(new Set(classes).size).toBe(variants.length);
  });

  /* 🔴 Отказ без объяснения недостижим для озвучки: нативный `disabled`
     убирает кнопку из обхода, и человек упирается в действие, которого нет.
     С названной причиной кнопка остаётся в фокусе, помечается `aria-disabled`
     и всё равно не срабатывает. */
  it('отказ с причиной остаётся в обходе, называет причину и не срабатывает', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled disabledReason="Нельзя удалить последнего администратора" onClick={onClick}>
        Удалить
      </Button>,
    );

    const button = screen.getByRole('button', {
      name: 'Удалить Нельзя удалить последнего администратора',
    });

    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await user.tab();
    expect(button).toHaveFocus();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('обычный отказ остаётся нативным disabled', () => {
    render(<Button disabled>Недоступно</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  /* 🔴 Геометрия панели приходит переменными её контейнера, а не вторым
     набором классов (ADR-187): классы у кнопки витрины и кнопки панели
     обязаны совпадать до символа, иначе развилка расползётся по коду. */
  it('внутри панели у кнопки те же классы, что и на витрине', () => {
    const plain = render(<Button size="sm">Сохранить</Button>).container.firstElementChild;
    const panel = render(
      <div data-ui="panel">
        <Button size="sm">Сохранить</Button>
      </div>,
    ).container.querySelector('button');

    expect(panel?.className).toBe(plain?.className);
  });
});

/* 🔴 Кнопку зовут из серверных компонентов — карточка каталога, шапка,
   страница 404. Функция в пропсах серверного компонента не сериализуется:
   React отвечает «Event handlers cannot be passed to Client Component props»
   и роняет страницу целиком. Так и случилось на разделе заказов панели.

   Проверяется сам элемент, а не отрисовка: в jsdom серверного рендера нет, а
   вопрос ровно один — оказалась ли функция в пропсах там, где её не давали. */
describe('Кнопка из серверного компонента', () => {
  it('🔴 без обработчика клика не подставляет свой', () => {
    const element = Button({ children: 'Заказать' });
    expect(element.props.onClick).toBeUndefined();
  });

  it('с обработчиком клика оборачивает его', () => {
    const element = Button({ children: 'Заказать', onClick: () => undefined });
    expect(typeof element.props.onClick).toBe('function');
  });

  /* Отказ снимает отправку формы: «мягко отключённая» кнопка нативного
     `disabled` не имеет, и `submit` без подмены типа ушёл бы по Enter. */
  it('отказ с причиной перестаёт быть кнопкой отправки', () => {
    const element = Button({
      children: 'Сохранить',
      type: 'submit',
      disabled: true,
      disabledReason: 'Нет прав',
    });

    expect(element.props.type).toBe('button');
  });
});
