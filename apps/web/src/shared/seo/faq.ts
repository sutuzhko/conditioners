import { compact, text, type JsonLdNode } from './schema';

/**
 * `FAQPage` для блоков вопросов и ответов (docs/SEO.md §4).
 *
 * 🔴 На вход подаётся тот самый список, который рисует видимый аккордеон —
 * результат `buildFaqItems` из `@/widgets/faq`. Собирать разметку отдельным
 * текстом нельзя: видимый ответ и ответ в разметке разойдутся при первой же
 * правке, а это ручные санкции (инвариант 9).
 *
 * Слой `shared` не импортирует виджеты (правило зависимостей, docs/CLAUDE.md),
 * поэтому источник передаёт страница:
 *
 * ```tsx
 * const facts = { installFrom, warranty };
 * <JsonLd nodes={[buildFaqPageJsonLd(buildFaqItems(facts))]} />
 * <Faq {...facts} />
 * ```
 */

/** Ровно то, что отдаёт `buildFaqItems`: вопрос и плоский текст ответа. */
export type FaqQuestion = {
  readonly question: string;
  readonly answer: string;
};

export function buildFaqPageJsonLd(
  items: readonly FaqQuestion[] | null | undefined,
): JsonLdNode | null {
  if (!Array.isArray(items)) return null;

  const questions = items.flatMap((item) => {
    const question = text(item.question);
    const answer = text(item.answer);
    if (question === undefined || answer === undefined) return [];

    return [
      compact({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      }),
    ];
  });

  if (questions.length === 0) return null;

  return { '@type': 'FAQPage', mainEntity: questions };
}
