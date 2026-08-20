import type { SettingKey } from '../model';

/**
 * Заглушка сидов. Она специально заметна глазом: правдоподобный
 * «+7 (4872) 00-00-00» уехал бы в прод незаметно и прожил там год
 * (PROJECT §3, «Сиды»).
 */
export const SETTING_PLACEHOLDER = 'ЗАПОЛНИТЕ В АДМИНКЕ';

export type SettingGap = {
  readonly key: SettingKey;
  /** Путь до незаполненного поля: `contacts.phones.0`. */
  readonly path: string;
  /**
   * `placeholder` — поле так и осталось с текстом сидов, это точно дефект.
   * `empty` — значение `null` (например, координаты). Часть таких полей
   * необязательна, поэтому решение принимает вызывающий код.
   */
  readonly reason: 'placeholder' | 'empty';
};

function walk(value: unknown, key: SettingKey, path: string, gaps: SettingGap[]): void {
  if (typeof value === 'string') {
    if (value.trim() === SETTING_PLACEHOLDER) gaps.push({ key, path, reason: 'placeholder' });
    return;
  }

  if (value === null || value === undefined) {
    gaps.push({ key, path, reason: 'empty' });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, key, `${path}.${i}`, gaps));
    return;
  }

  if (typeof value === 'object') {
    for (const [field, nested] of Object.entries(value)) {
      walk(nested, key, path === '' ? field : `${path}.${field}`, gaps);
    }
  }
}

/**
 * Что в группе настроек ещё не заполнено. Используется проверкой готовности
 * перед запуском: сайт не должен уйти в индекс с заглушками вместо телефона
 * и реквизитов.
 */
export function findSettingGaps(key: SettingKey, value: unknown): SettingGap[] {
  const gaps: SettingGap[] = [];
  walk(value, key, '', gaps);
  return gaps;
}
