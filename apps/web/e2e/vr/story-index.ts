import { readFileSync } from 'node:fs';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function toStoryEntry(value: unknown): StoryEntry | null {
  if (!isRecord(value)) return null;
  const { id, type, title, name, tags } = value;
  if (
    typeof id !== 'string' ||
    typeof type !== 'string' ||
    typeof title !== 'string' ||
    typeof name !== 'string'
  ) {
    return null;
  }
  if (tags !== undefined && !isStringArray(tags)) return null;
  return tags === undefined ? { id, type, title, name } : { id, type, title, name, tags };
}

/**
 * Истории из `index.json` витрины. Документы (`type: 'docs'`) и записи
 * неизвестной формы отбрасываются: снимать можно только историю.
 */
function storyEntries(index: unknown): readonly StoryEntry[] {
  if (!isRecord(index) || !isRecord(index.entries)) return [];
  return Object.values(index.entries)
    .map(toStoryEntry)
    .filter((entry): entry is StoryEntry => entry !== null && entry.type === 'story');
}

export async function loadStories(
  request: APIRequestContext,
  sections: readonly string[],
): Promise<readonly StoryEntry[]> {
  const response = await request.get('/index.json');
  expect(response.status(), 'Storybook не отвечает — поднимите контейнер storybook').toBe(200);

  const index: unknown = await response.json();

  return storyEntries(index).filter((entry) =>
    sections.some((section) => entry.title.startsWith(section)),
  );
}

/**
 * Истории базы сравнения — из `index.json` витрины `merge-base`, который
 * работа пайплайна кладёт рядом с её кадрами (ADR-230).
 *
 * История, которой здесь нет, новая: эталона у неё быть не может, и сравнивать
 * её не с чем. Без переменной `VR_BASE_INDEX` возвращается `null` —
 * сравниваются все истории, как при локальном прогоне.
 *
 * 🔴 Файл, который не читается или не разбирается, — ошибка, а не «сравниваем
 * всё»: молчаливый откат к полному сравнению покрасил бы каждую новую историю
 * как разошедшуюся и спрятал бы сломанную работу за правдоподобным красным.
 */
export function loadBaseStoryIds(): ReadonlySet<string> | null {
  const path = process.env.VR_BASE_INDEX;
  if (path === undefined || path.length === 0) return null;

  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`VR_BASE_INDEX: не удалось прочитать ${path}: ${describeError(error)}`);
  }

  let index: unknown;
  try {
    index = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `VR_BASE_INDEX: ${path} — это не JSON индекса витрины: ${describeError(error)}`,
    );
  }

  const ids = storyEntries(index).map((entry) => entry.id);
  if (ids.length === 0) {
    throw new Error(`VR_BASE_INDEX: в ${path} нет ни одной истории — это не индекс витрины`);
  }

  return new Set(ids);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
