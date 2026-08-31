import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CardBody, CardFooter, CardHeader } from './CardBelt';

describe('Пояса карточки', () => {
  it('шапка ставит заголовок уровнем h3 по умолчанию', () => {
    render(<CardHeader title="Заказы за неделю" />);

    expect(screen.getByRole('heading', { level: 3, name: 'Заказы за неделю' })).toBeInTheDocument();
  });

  it('уровень заголовка задаётся пропом — иначе карточка пропускает ступень', () => {
    render(<CardHeader title="Показатели" as="h2" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Показатели' })).toBeInTheDocument();
  });

  it('шапка без заголовка не оставляет пустой heading в дереве', () => {
    render(<CardHeader action={<button type="button">Обновить</button>} />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обновить' })).toBeInTheDocument();
  });

  it('действие шапки остаётся доступным, а не превращается в текст', () => {
    render(<CardHeader title="Наряды" action={<button type="button">Добавить</button>} />);

    expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument();
  });

  it('тело и подвал отдают содержимое как есть', () => {
    render(
      <>
        <CardBody>Список пуст</CardBody>
        <CardFooter>
          <button type="button">Сохранить</button>
        </CardFooter>
      </>,
    );

    expect(screen.getByText('Список пуст')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument();
  });

  it('подпись под заголовком выводится отдельной строкой', () => {
    render(<CardHeader title="Склад" subtitle="14 позиций на исходе" />);

    expect(screen.getByText('14 позиций на исходе')).toBeInTheDocument();
  });
});
