import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { OrderWorkTabs } from './OrderWorkTabs';
import { orderManagerContent as texts } from './content';

function renderTabs() {
  return render(
    <OrderWorkTabs
      order={<p>Данные наряда</p>}
      checklist={<p>Список сборов</p>}
      files={<p>Договор и снимки</p>}
    />,
  );
}

describe('Вкладки наряда', () => {
  it('три вкладки из разбора прототипа, открыт наряд', () => {
    renderTabs();

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: texts.tabOrder })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('переключение показывает свою панель и прячет остальные', async () => {
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: texts.tabChecklist }));

    expect(screen.getByText('Список сборов')).toBeVisible();
    expect(screen.getByText('Данные наряда')).not.toBeVisible();
  });

  it('🔴 скрытая панель остаётся в разметке: наполовину заполненный отчёт не теряется', async () => {
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: texts.tabFiles }));

    expect(screen.getByText('Данные наряда')).toBeInTheDocument();
  });

  it('стрелки переводят между вкладками — это лента, а не набор кнопок', async () => {
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: texts.tabOrder }));
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: texts.tabChecklist })).toHaveFocus();
  });

  it('End уводит на последнюю вкладку, Home возвращает на первую', async () => {
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: texts.tabOrder }));
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: texts.tabFiles })).toHaveFocus();

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: texts.tabOrder })).toHaveFocus();
  });

  it('из ленты вкладок Tab выводит на панель, а не на соседнюю вкладку', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: texts.tabChecklist })).toHaveAttribute('tabindex', '-1');
  });

  it('панель подписана своей вкладкой', () => {
    renderTabs();

    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'order-tab-order');
  });
});
