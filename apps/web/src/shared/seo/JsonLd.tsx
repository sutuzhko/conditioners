import { SCHEMA_CONTEXT, type JsonLdNode } from './schema';

/**
 * Вывод разметки в `<script type="application/ld+json">`.
 *
 * Компонент серверный: разметка приходит в HTML вместе со страницей, роботу
 * не нужно ждать JS (инвариант 1). Узлы собираются в один `@graph` — так
 * `@context` объявляется один раз, а ссылки между узлами по `@id` работают
 * внутри одного документа.
 *
 * Пустые узлы отбрасываются: сборщик, которому нечего сказать, возвращает
 * `null`, и пустого скрипта в HTML не появляется.
 */

export type JsonLdProps = {
  readonly nodes: readonly (JsonLdNode | null | undefined)[];
};

/**
 * Экранирование `<`: без него строка `</script>` внутри данных закрыла бы тег
 * и превратила разметку в исполняемый HTML. Числовая ссылка внутри JSON
 * остаётся тем же символом после разбора.
 */
function serialize(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function JsonLd({ nodes }: JsonLdProps) {
  const graph = nodes.filter((node): node is JsonLdNode => node !== null && node !== undefined);
  if (graph.length === 0) return null;

  const payload = { '@context': SCHEMA_CONTEXT, '@graph': graph };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(payload) }} />
  );
}
