import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatTile, StatTiles } from './StatTile';

describe('Плитка показателя', () => {
  it('показывает подпись, число и пояснение', () => {
    render(<StatTile label="Заказы" value="128" note="за неделю" />);

    expect(screen.getByText('Заказы')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('за неделю')).toBeInTheDocument();
  });

  it('чип роста несёт глиф и число', () => {
    render(<StatTile label="Заказы" value="128" delta={{ trend: 'up', value: '+4' }} />);

    expect(screen.getByText('↑')).toBeInTheDocument();
    expect(screen.getByText('+4')).toBeInTheDocument();
  });

  it('чип спада несёт свой глиф', () => {
    render(<StatTile label="Отказы" value="3" delta={{ trend: 'down', value: '−3' }} />);

    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('ровное изменение показывается знаком равенства, а не пустотой', () => {
    render(<StatTile label="Заявки" value="12" delta={{ trend: 'flat', value: '0' }} />);

    expect(screen.getByText('=')).toBeInTheDocument();
  });

  /* 🔴 Краска чипа шесть красок различает не всякий глаз, а на чёрно-белой
     печати наряда они совпадают все. Слово рядом с глифом — единственное,
     что переживает и то и другое. */
  it.each([
    ['up', 'рост'],
    ['down', 'спад'],
    ['flat', 'без изменений'],
  ] as const)('направление «%s» называется словом для озвучки', (trend, word) => {
    render(<StatTile label="Заказы" value="128" delta={{ trend, value: '+1' }} />);

    expect(screen.getByText(word)).toBeInTheDocument();
  });

  it('краска чипа переопределяется: рост отказов — плохая новость', () => {
    const { container } = render(
      <StatTile label="Отказы" value="9" delta={{ trend: 'up', value: '+2', tone: 'danger' }} />,
    );

    const chip = container.querySelector('dd > span:last-child');
    expect(chip?.className).toContain('danger');
    expect(chip?.className).not.toContain('success');
  });

  it('хвост после числа выводится, когда задан', () => {
    render(<StatTile label="Выручка" value="128 400" suffix="₽" />);

    expect(screen.getByText('₽')).toBeInTheDocument();
  });

  it('ряд плиток получает имя для озвучки', () => {
    render(
      <StatTiles label="Показатели недели">
        <StatTile label="Заказы" value="128" />
      </StatTiles>,
    );

    expect(screen.getByRole('group', { name: 'Показатели недели' })).toBeInTheDocument();
  });
});
