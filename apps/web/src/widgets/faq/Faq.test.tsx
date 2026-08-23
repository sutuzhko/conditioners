import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { formatMoney } from '@/shared/lib/format';

import { Faq } from './Faq';
import { buildFaqItems, faqContent as t } from './content';
import {
  installFromFixture,
  warrantyEmpty,
  warrantyFixture,
  warrantyPlaceholder,
} from './fixtures';

describe('Блок FAQ', () => {
  it('🔴 ответы лежат в DOM в свёрнутом виде — их читает разметка FAQPage', async () => {
    const { container } = render(
      <Faq installFrom={installFromFixture} warranty={warrantyFixture} />,
    );

    const items = buildFaqItems({ installFrom: installFromFixture, warranty: warrantyFixture });

    // ни один раздел не раскрыт...
    const triggers = screen.getAllByRole('button', { expanded: false });
    expect(triggers).toHaveLength(items.length);

    // ...и при этом каждый ответ уже присутствует в HTML дословно
    for (const entry of items) {
      expect(container.textContent).toContain(entry.answer);
    }

    // после раскрытия текст тот же самый — панель не подгружается по клику
    const first = triggers[0];
    if (first === undefined) throw new Error('вопросов нет');
    await userEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    for (const entry of items) {
      expect(container.textContent).toContain(entry.answer);
    }
  });

  it('рисует все семь вопросов прототипа заголовками третьего уровня', () => {
    render(<Faq />);

    const items = buildFaqItems();
    expect(items).toHaveLength(7);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(items.length);
    for (const entry of items) {
      expect(screen.getByRole('button', { name: entry.question })).toBeInTheDocument();
    }
  });

  it('🔴 без прайса в ответах нет ни одной цены', () => {
    const { container } = render(<Faq />);

    expect(container.textContent).not.toContain('₽');
    for (const entry of buildFaqItems()) {
      expect(entry.answer).not.toContain('₽');
    }
  });

  it('цена монтажа приходит из прайса и попадает в ответ', () => {
    const { container } = render(<Faq installFrom={installFromFixture} />);

    expect(container.textContent).toContain(formatMoney(installFromFixture));
  });

  it('🔴 срок гарантии берётся только из настроек', () => {
    const { container, rerender } = render(<Faq warranty={warrantyFixture} />);
    expect(container.textContent).toContain(warrantyFixture.installation);
    expect(container.textContent).toContain(warrantyFixture.equipment);

    // настройки не заполнены — ответ обходится без срока, а не выдумывает его
    rerender(<Faq warranty={warrantyEmpty} />);
    const warrantyEntry = buildFaqItems({ warranty: warrantyEmpty }).find(
      (entry) => entry.id === 'warranty',
    );
    expect(warrantyEntry?.answer).not.toMatch(/\d/);
  });

  it('заглушка сидов видна в ответе — незаполненный раздел не маскируется', () => {
    const { container } = render(<Faq warranty={warrantyPlaceholder} />);

    expect(screen.getByRole('button', { name: 'Что входит в гарантию?' })).toBeInTheDocument();
    expect(container.textContent).toContain('ЗАПОЛНИТЕ В АДМИНКЕ');
  });

  it('у секции один заголовок второго уровня — h1 принадлежит странице', () => {
    render(<Faq />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2, name: t.title })).toHaveLength(1);
  });
});
