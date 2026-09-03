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

/** Раскрывающиеся строки вопросов: родные `<details>`, а не кнопки со состоянием. */
function rows(container: HTMLElement): HTMLDetailsElement[] {
  return [...container.querySelectorAll('details')];
}

describe('Блок FAQ', () => {
  it('🔴 ответы лежат в DOM в свёрнутом виде — их читает разметка FAQPage', async () => {
    const { container } = render(
      <Faq installFrom={installFromFixture} warranty={warrantyFixture} />,
    );

    const items = buildFaqItems({ installFrom: installFromFixture, warranty: warrantyFixture });
    const details = rows(container);

    // ни один раздел не раскрыт...
    expect(details).toHaveLength(items.length);
    expect(details.every((row) => !row.open)).toBe(true);

    // ...и при этом каждый ответ уже присутствует в HTML дословно
    for (const entry of items) {
      expect(container.textContent).toContain(entry.answer);
    }

    // после раскрытия текст тот же самый — панель не подгружается по клику
    const first = details[0];
    if (first === undefined) throw new Error('вопросов нет');
    const summary = first.querySelector('summary');
    if (summary === null) throw new Error('у вопроса нет строки');

    await userEvent.click(summary);
    expect(first.open).toBe(true);
    for (const entry of items) {
      expect(container.textContent).toContain(entry.answer);
    }
  });

  it('🔴 строка вопроса достижима с клавиатуры первым же Tab', async () => {
    const { container } = render(<Faq />);

    const first = rows(container)[0];
    if (first === undefined) throw new Error('вопросов нет');

    await userEvent.tab();
    expect(first.querySelector('summary')).toHaveFocus();

    /* Само раскрытие по Enter — поведение браузера у `<summary>`, и jsdom его
       не реализует: там строка открывается только по клику. Проверено в
       Chromium (issue #282), здесь остаётся то, что jsdom действительно
       умеет, — попадание фокуса на строку. */
  });

  it('🔴 открыт не больше одного вопроса: строки связаны общей группой', () => {
    const { container } = render(<Faq />);

    const names = new Set(rows(container).map((row) => row.getAttribute('name')));
    expect(names.size).toBe(1);
    expect(names.has('faq')).toBe(true);
  });

  it('рисует все семь вопросов прототипа заголовками третьего уровня', () => {
    const { container } = render(<Faq />);

    const items = buildFaqItems();
    expect(items).toHaveLength(7);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(items.length);
    for (const entry of items) {
      expect(screen.getByRole('heading', { level: 3, name: entry.question })).toBeInTheDocument();
    }
    expect(rows(container)).toHaveLength(items.length);
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

    expect(
      screen.getByRole('heading', { level: 3, name: 'Что входит в гарантию?' }),
    ).toBeInTheDocument();
    expect(container.textContent).toContain('ЗАПОЛНИТЕ В АДМИНКЕ');
  });

  it('у секции один заголовок второго уровня — h1 принадлежит странице', () => {
    render(<Faq />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2, name: t.title })).toHaveLength(1);
  });
});
