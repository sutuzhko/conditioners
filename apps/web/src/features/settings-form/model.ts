/**
 * Описание полей настроек.
 *
 * Групп двенадцать, полей под шестьдесят, и все они — текст, число, флажок
 * или список строк. Двенадцать рукописных форм разошлись бы между собой уже
 * на третьей правке, поэтому форма одна, а группы описаны данными.
 *
 * Схема Zod остаётся источником истины для значений (`entities/settings`),
 * здесь — только то, чего в схеме нет и быть не должно: подпись поля,
 * подсказка и способ ввода.
 */
import type { SettingKey } from '@/entities/settings/model';

export type FieldKind = 'text' | 'longText' | 'number' | 'checkbox' | 'select' | 'list';

export type FieldDescriptor = {
  /** Путь внутри группы: `email` или `messengerButtons.telegram`. */
  readonly path: string;
  readonly label: string;
  readonly kind: FieldKind;
  /** Пояснение под полем: зачем оно и как заполнять. */
  readonly hint?: string;
  /** Подпись каждой строки списка: «Телефон», «Район». */
  readonly itemLabel?: string;
  /** Варианты для `select`. */
  readonly options?: readonly string[];
  readonly placeholder?: string;
};

export type GroupDescriptor = {
  readonly key: SettingKey;
  readonly title: string;
  /** Зачем эта группа нужна: куда данные попадут на сайте. */
  readonly description: string;
  readonly fields: readonly FieldDescriptor[];
};

/** Значение группы — произвольный объект: его форму знает схема, а не форма. */
export type GroupValue = Record<string, unknown>;

export type SaveStatus = 'idle' | 'sending' | 'success' | 'error';

export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string; readonly fieldErrors?: Record<string, string> };

export type SaveGroup = (key: SettingKey, value: GroupValue) => Promise<SaveResult>;
