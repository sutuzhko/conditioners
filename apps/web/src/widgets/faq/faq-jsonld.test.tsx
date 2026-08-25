import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { formatMoney } from '@/shared/lib/format';
import { Faq, buildFaqItems } from '@/widgets/faq';

import { buildFaqPageJsonLd } from '@/shared/seo';

/**
 * 🔴 Инвариант 9 в чистом виде: разметка `FAQPage` строится из того же
 * `buildFaqItems`, который рисует видимый аккордеон. Тест сравнивает не
 * «похожие тексты», а факт единственного источника: каждый вопрос и каждый
 * ответ из разметки присутствует в HTML дословно.
 */

const facts = {
  installFrom: 6000,
  warranty: {
    installation: 'Гарантия на монтаж — 3 года.',
    equipment: 'На технику — гарантия производителя.',
  },
};

/** Ожидаемая разметка одного вопроса — ровно то, что отдал `buildFaqItems`. */
function expectedQuestion(entry: { question: string; answer: string }) {
  return {
    '@type': 'Question',
    name: entry.question,
    acceptedAnswer: { '@type': 'Answer', text: entry.answer },
  };
}

describe('FAQPage', () => {
  it('🔴 текст в разметке дословно совпадает с видимым текстом блока', () => {
    const items = buildFaqItems(facts);
    const node = buildFaqPageJsonLd(items);
    const { container } = render(<Faq {...facts} />);

    // разметка — это ровно те же вопросы и ответы, что вернул buildFaqItems
    expect(node?.mainEntity).toEqual(items.map(expectedQuestion));

    // и каждый из них дословно присутствует в видимом HTML блока
    for (const entry of items) {
      expect(container.textContent).toContain(entry.question);
      expect(container.textContent).toContain(entry.answer);
    }
  });

  it('🔴 цифра из прайса попадает и в ответ, и в разметку — или не попадает никуда', () => {
    const withPrice = JSON.stringify(buildFaqPageJsonLd(buildFaqItems({ installFrom: 6000 })));
    const withoutPrice = JSON.stringify(buildFaqPageJsonLd(buildFaqItems({})));

    expect(withPrice).toContain(formatMoney(6000));
    // без прайса ответ формулируется без цены, а не с выдуманной
    expect(withoutPrice).not.toContain(formatMoney(6000));
  });

  it('структура разметки — вопрос и принятый ответ', () => {
    const node = buildFaqPageJsonLd([{ question: 'Вопрос?', answer: 'Ответ.' }]);

    expect(node).toEqual({
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Вопрос?',
          acceptedAnswer: { '@type': 'Answer', text: 'Ответ.' },
        },
      ],
    });
  });

  it('пустой список вопросов разметки не порождает', () => {
    expect(buildFaqPageJsonLd([])).toBeNull();
    expect(buildFaqPageJsonLd(undefined)).toBeNull();
    expect(buildFaqPageJsonLd([{ question: ' ', answer: 'Ответ' }])).toBeNull();
  });
});
