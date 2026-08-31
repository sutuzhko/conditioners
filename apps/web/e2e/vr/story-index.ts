import { expect, type APIRequestContext } from '@playwright/test';

/**
 * Список историй витрины и правило, на каких ширинах их снимать. Общее для
 * публичного раннера и раннера панели: обе выборки читают один и тот же
 * `index.json`, и разъехаться им незачем.
 */

export type StoryEntry = {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly name: string;
  readonly tags?: readonly string[];
};

/**
 * 🔴 Тег `vr-<ширина>` закрепляет историю за ширинами, на которых она имеет
 * смысл (issue #436, ADR-219).
 *
 * Истории вроде «Меню на телефоне» написаны под одну раскладку: их сценарий
 * открывает меню кнопкой, которой на десктопе нет вовсе. Раннер снимал их на
 * всех четырёх ширинах, сценарий на лишних падал — и падал молча, а снимок
 * повторял соседнюю историю. Без тега история снимается на всех ширинах, как
 * и раньше.
 */
const WIDTH_TAG = /^vr-(\d+)$/;

export function pinnedWidths(story: StoryEntry, allowed: readonly number[]): readonly number[] {
  const pinned = (story.tags ?? []).flatMap((tag) => {
    const match = WIDTH_TAG.exec(tag);
    return match === null ? [] : [Number(match[1])];
  });

  if (pinned.length === 0) return allowed;

  /* 🔴 Опечатка в теге обязана быть громкой. Молча она означала бы, что
     история не снимается ни на одной ширине, а прогон при этом зелёный. */
  const unknown = pinned.filter((width) => !allowed.includes(width));
  expect(unknown, `история ${story.id}: тег vr-${unknown.join(',')} не из набора ширин`).toEqual(
    [],
  );

  return pinned;
}

export async function loadStories(
  request: APIRequestContext,
  sections: readonly string[],
): Promise<readonly StoryEntry[]> {
  const response = await request.get('/index.json');
  expect(response.status(), 'Storybook не отвечает — поднимите контейнер storybook').toBe(200);

  const index: unknown = await response.json();
  const entries = (index as { entries?: Record<string, StoryEntry> }).entries ?? {};

  return Object.values(entries).filter(
    (entry) =>
      entry.type === 'story' && sections.some((section) => entry.title.startsWith(section)),
  );
}
