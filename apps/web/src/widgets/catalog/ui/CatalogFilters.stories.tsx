import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { catalogFacets, parseCatalogQuery } from '@/entities/product/lib/catalogQuery';

import { catalogListText } from '../content';
import { catalogFixture, expiredSaleProduct } from '../fixtures';
import { CatalogFilters, type CatalogFiltersProps } from './CatalogFilters';

const catalog = [...catalogFixture, expiredSaleProduct];

function argsFor(raw: Record<string, string> = {}): CatalogFiltersProps {
  return {
    facets: catalogFacets(catalog),
    query: parseCatalogQuery(raw),
    basePath: '/catalog',
  };
}

/**
 * Подбор отдельно от каталога: у него два вида, и разводит их не пропс, а
 * ширина экрана (ADR-121).
 *
 * На 320, 375 и 768 подбор свёрнут в строку `<summary>` — первый экран
 * каталога должен показывать товар. На 1200 он раскрыт стилем и стоит боковой
 * колонкой. Снимки истории на четырёх ширинах поэтому показывают оба
 * состояния сами, без переключателя в аргументах.
 */
const meta = {
  title: 'Блоки/Каталог — подбор',
  component: CatalogFilters,
  args: argsFor(),
  parameters: {
    layout: 'padded',
    // Допущение инвариантов — причина в reason (ADR-230)
    invariants: {
      allow: [
        { rule: 'occlusion', reason: 'issue #474 — ссылки подбора накрыты карточками на 320–768' },
      ],
    },
  },
} satisfies Meta<typeof CatalogFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = { name: 'Свёрнут — одна строка над выдачей' };

export const Expanded: Story = {
  name: 'Развёрнут нажатием на узкой ширине',
  play: async ({ canvasElement }) => {
    // именно нажатие, а не атрибут: сворачивание должно работать без единой
    // строки JavaScript, и история обязана это показывать
    await userEvent.click(
      within(canvasElement).getByText(catalogListText.filtersTitle, { selector: 'summary' }),
    );

    /* 🔴 Сценарий обязан кончаться проверкой, а не действием (issue #435):
       иначе история объявляется готовой в момент раскрытия, и снимок ловит
       подбор то развёрнутым, то нет. */
    await waitFor(() => expect(canvasElement.querySelector('details')).toHaveAttribute('open'));
  },
};

export const Narrowed: Story = {
  name: 'Выбраны класс и площадь',
  args: argsFor({ class: '09', area: '25' }),
};
