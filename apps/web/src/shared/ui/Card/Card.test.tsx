import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('рисует содержимое', () => {
    render(<Card>Монтаж под ключ</Card>);
    expect(screen.getByText('Монтаж под ключ')).toBeInTheDocument();
  });

  it('меняет тег по props as — карточка отзыва должна быть article', () => {
    render(<Card as="article">Отзыв</Card>);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('пробрасывает атрибуты контейнера', () => {
    render(
      <Card aria-label="Карточка модели" data-testid="model">
        09
      </Card>,
    );
    expect(screen.getByTestId('model')).toHaveAttribute('aria-label', 'Карточка модели');
  });
  /* 🔴 Карточка стоит во всех блоках: появление новых осей не должно менять
     то, как она рисуется без них. Явные radius="lg" и elevation="card"
     повторяют прежнее умолчание — и обязаны давать другой набор классов,
     иначе умолчание уже переехало на новую ось. */
  it('без radius и elevation умолчание остаётся за вариантом', () => {
    const plain = render(<Card>Базовая</Card>).container.firstElementChild;
    const explicit = render(
      <Card radius="lg" elevation="card">
        Явная
      </Card>,
    ).container.firstElementChild;

    expect(plain?.className).not.toBe(explicit?.className);
  });

  it('радиус и глубина задаются независимо от варианта', () => {
    const raised = render(
      <Card variant="default" radius="xxl" elevation="raised">
        Подбор
      </Card>,
    ).container.firstElementChild;
    const flat = render(
      <Card variant="default" radius="ml" elevation="none">
        Витрина
      </Card>,
    ).container.firstElementChild;

    expect(raised?.className).not.toBe(flat?.className);
  });

  it('bordered={false} снимает рамку — карточка формы на тёмной секции', () => {
    const bordered = render(<Card>С рамкой</Card>).container.firstElementChild;
    const bare = render(<Card bordered={false}>Без рамки</Card>).container.firstElementChild;

    expect(bare?.className).not.toBe(bordered?.className);
    expect(bare?.className).toContain(String(bordered?.className));
  });
});
