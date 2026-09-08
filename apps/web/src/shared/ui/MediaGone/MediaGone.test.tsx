import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MediaGone } from './MediaGone';

describe('MediaGone', () => {
  it('не создаёт картинку: значку битого файла взяться неоткуда', () => {
    const { container } = render(<MediaGone title="Фото недоступно" note="Файл не найден" />);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Фото недоступно')).toBeInTheDocument();
    expect(screen.getByText('Файл не найден')).toBeInTheDocument();
  });

  it('без пояснения рисует один заголовок: в мелкой плитке места нет', () => {
    render(<MediaGone title="Файла нет" />);

    expect(screen.getByRole('note')).toHaveTextContent('Файла нет');
    expect(screen.getByRole('note').childElementCount).toBe(1);
  });

  it('🔴 заголовка не рисует: этим он и не EmptyState (issue #877)', () => {
    /* `EmptyState` и `ErrorState` ставят `<h2>` намеренно — обход по
       заголовкам обязан останавливаться на пустом разделе. Эта плашка стоит
       внутри карточки и повторяется по числу снимков: в галерее наряда шесть
       заголовков подряд сломали бы структуру (инвариант 4) и превратили бы
       обход озвучкой в перечисление одинаковых «Фото недоступно». */
    render(<MediaGone title="Фото недоступно" note="Файл не найден" />);

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('🔴 класс раздела стоит первым: по нему плашку зовут измерения', () => {
    render(<MediaGone title="Файла нет" className="thumb" />);

    /* Порядок не про CSS, где он не значит ничего, а про снимок раскладки: узел
       называется первым классом-модулем. Китовый класс впереди сделал бы плашку
       во всех шести разделах одинаковым безымянным узлом (ADR-234). */
    expect(screen.getByRole('note').classList.item(0)).toBe('thumb');
    expect(screen.getByRole('note').classList).toHaveLength(2);
  });
});
