import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StockStats } from './StockStats';
import { stockManagerContent as texts } from './content';
import { noThresholdOverview, overview } from './fixtures';

/**
 * Плитки показателей склада (issue #606).
 *
 * 🔴 Проверяется не вёрстка, а то, какие числа плитка показывает: «позиций в
 * справочнике» считает справочник, а не отобранное фильтром, и владельческие
 * ключи не появляются там, где их нет.
 */
describe('Показатели склада', () => {
  it('показывает справочник, порог, подход к порогу и зоны', () => {
    render(<StockStats overview={overview} />);

    expect(screen.getByText(texts.tileItems)).toBeVisible();
    expect(screen.getByText(texts.tileLow)).toBeVisible();
    expect(screen.getByText(texts.tileNear)).toBeVisible();
    expect(screen.getByText(texts.tileZones)).toBeVisible();
  });

  it('🔴 «позиций в справочнике» не меняется от поиска: это цифра склада', () => {
    /* Фильтр отобрал одну позицию из сорока двух — плитка показывает сорок две. */
    render(<StockStats overview={{ ...overview, total: 1, itemsTotal: 42 }} />);

    expect(screen.getByText('42')).toBeVisible();
  });

  it('зон столько, сколько их пришло с остатками', () => {
    render(<StockStats overview={overview} />);

    expect(screen.getByText(String(overview.zones.length))).toBeVisible();
  });

  it('заказывать нечего — плитка говорит это словами, а не пустым нулём', () => {
    render(<StockStats overview={{ ...overview, lowCount: 0, nearCount: 0 }} />);

    expect(screen.getByText(texts.tileLowCalm)).toBeVisible();
  });

  it('🔴 порога у монтажника нет вовсе: плиток про порог он не получает', () => {
    render(<StockStats overview={noThresholdOverview} />);

    expect(screen.queryByText(texts.tileLow)).not.toBeInTheDocument();
    expect(screen.queryByText(texts.tileNear)).not.toBeInTheDocument();
    expect(screen.getByText(texts.tileItems)).toBeVisible();
  });
});
