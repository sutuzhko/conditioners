/**
 * Описание полей настроек.
 *
 * Групп тринадцать, полей под шестьдесят, и все они — текст, число, время,
 * флажок или список строк. Тринадцать рукописных форм разошлись бы между
 * собой уже на третьей правке, поэтому форма одна, а группы описаны данными.
 *
 * Схема Zod остаётся источником истины для значений (`entities/settings`),
 * здесь — только то, чего в схеме нет и быть не должно: подпись поля,
 * подсказка и способ ввода.
 */
import type { SettingKey } from '@/entities/settings/model';

export type FieldKind =
  | 'text'
  | 'longText'
  | 'number'
  /**
   * Время дня. Владелец вводит его временем («09:00»), а хранится оно
   * минутами от московской полуночи: сетка календаря считает в минутах, и
   * разбирать ради неё строку, написанную человеком, нельзя (ADR-138).
   */
  | 'time'
  | 'checkbox'
  | 'select'
  | 'list'
  | 'objectList';

/**
 * Колонка списка объектов: цифры первого экрана — это не строки, а тройки
 * «число + хвост + подпись». Описание колонки — то же самое поле, только
 * без списков внутри: вложенность глубже одного уровня форма не разбирает,
 * и заводить её ради несуществующего случая незачем.
 */
export type ColumnDescriptor = {
  readonly key: string;
  readonly label: string;
  readonly kind: 'text' | 'number';
  /** Доля ширины колонки: подпись шире числа. */
  readonly grow?: number;
};

export type FieldDescriptor = {
  /** Путь внутри группы: `email` или `messengerButtons.telegram`. */
  readonly path: string;
  readonly label: string;
  readonly kind: FieldKind;
  /** Пояснение под полем: зачем оно и как заполнять. */
  readonly hint?: string;
  /** Подпись каждой строки списка: «Телефон», «Район». */
  readonly itemLabel?: string;
  /** Колонки для `objectList`. */
  readonly columns?: readonly ColumnDescriptor[];
  /** Предел числа строк: у списка объектов он приходит из схемы. */
  readonly maxItems?: number;
  /** Варианты для `select`. */
  readonly options?: readonly string[];
  /**
   * Маска ввода. Телефон в админке набирают так же, как на сайте, — и
   * приводить его к единому виду должен тот же код, а не привычка владельца.
   */
  readonly mask?: 'phone';
  readonly placeholder?: string;
};

export type GroupDescriptor = {
  readonly key: SettingKey;
  readonly title: string;
  /** Зачем эта группа нужна: куда данные попадут на сайте. */
  readonly description: string;
  /**
   * Что произошло после сохранения, если не «изменения уже на сайте».
   *
   * Общая заметка верна для данных компании — они стоят в шапке и футере
   * каждой страницы. Рабочее окно на сайт не попадает вовсе, и сказать
   * владельцу, что оно там уже видно, значит соврать.
   */
  readonly savedNote?: string;
  readonly fields: readonly FieldDescriptor[];
};

/** Значение группы — произвольный объект: его форму знает схема, а не форма. */
export type GroupValue = Record<string, unknown>;

export type SaveStatus = 'idle' | 'sending' | 'success' | 'error';

export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string; readonly fieldErrors?: Record<string, string> };

export type SaveGroup = (key: SettingKey, value: GroupValue) => Promise<SaveResult>;
