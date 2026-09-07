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

  it('🔴 класс раздела стоит первым: по нему плашку зовут измерения', () => {
    render(<MediaGone title="Файла нет" className="thumb" />);

    /* Порядок не про CSS, где он не значит ничего, а про снимок раскладки: узел
       называется первым классом-модулем. Китовый класс впереди сделал бы плашку
       во всех шести разделах одинаковым безымянным узлом (ADR-234). */
    expect(screen.getByRole('note').classList.item(0)).toBe('thumb');
    expect(screen.getByRole('note').classList).toHaveLength(2);
  });
});
