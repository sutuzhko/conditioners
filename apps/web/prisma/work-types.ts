/**
 * Справочник видов работ — стартовое наполнение (ADR-343, issue #830).
 *
 * 🔴 Это сид, а не перечень видов работ в коде. После первого наката владелец
 * правит справочник из настроек: заводит «Чистку дренажа», меняет цвет
 * «Монтажа», отключает то, чем не занимается (инвариант 8). Сид его больше не
 * трогает — он заполняет пустой справочник, а не выравнивает существующий.
 *
 * Значения — те же, что стояли в `KIND_LOOK` и `ORDER_LOOK` до переезда:
 * подписи, значки и краски, к которым владелец привык. Ту же семёрку
 * заводит и миграция `20260908120000_work_type_dictionary` — на боевой базе
 * справочник появляется вместе со схемой, а не после запуска сида.
 */

/** Краска палитры — значения перечисления `WorkTypeTone` в схеме. */
type SeedTone = 'ACCENT' | 'INFO' | 'OK' | 'WARN' | 'SALE' | 'ERROR' | 'NEUTRAL';

export type SeedWorkType = {
  /** Тот же идентификатор, что ставит миграция: справочник обязан совпадать. */
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly tone: SeedTone;
  readonly icon: string;
  readonly sort: number;
  /** Предлагать ли вид работ посетителю в форме заявки. */
  readonly onSite: boolean;
  /** Дело этого вида занимает день целиком: «Заметка» висит на дне. */
  readonly dayLong: boolean;
};

/**
 * Порядок — тот, в каком виды дел стояли в поле «Что за дело» до переезда: у
 * владельца ничего не переставляется без его ведома. «Ремонт» встаёт рядом с
 * «Обслуживанием» — он приходит из типов наряда и в поле дела прежде не
 * предлагался.
 *
 * «Предлагать на сайте» стоит у того, что посетитель заказывает словами:
 * замер, монтаж, обслуживание и ремонт. Звонок, встреча и заметка — внутренняя
 * кухня, в форме заявки им делать нечего.
 */
export const SEED_WORK_TYPES: readonly SeedWorkType[] = [
  {
    id: 'wt_call',
    code: 'call',
    title: 'Звонок',
    tone: 'ACCENT',
    icon: 'phone',
    sort: 10,
    onSite: false,
    dayLong: false,
  },
  {
    id: 'wt_measure',
    code: 'measure',
    title: 'Замер',
    tone: 'INFO',
    icon: 'map-point',
    sort: 20,
    onSite: true,
    dayLong: false,
  },
  {
    id: 'wt_install',
    code: 'install',
    title: 'Монтаж',
    tone: 'OK',
    icon: 'wrench',
    sort: 30,
    onSite: true,
    dayLong: false,
  },
  {
    id: 'wt_service',
    code: 'service',
    title: 'Обслуживание',
    tone: 'WARN',
    icon: 'settings',
    sort: 40,
    onSite: true,
    dayLong: false,
  },
  {
    id: 'wt_repair',
    code: 'repair',
    title: 'Ремонт',
    tone: 'ERROR',
    icon: 'pulse',
    sort: 50,
    onSite: true,
    dayLong: false,
  },
  {
    id: 'wt_meeting',
    code: 'meeting',
    title: 'Встреча',
    tone: 'SALE',
    icon: 'chat',
    sort: 60,
    onSite: false,
    dayLong: false,
  },
  /* 🔴 Заметка висит на дне, а не на часе — до справочника это решала строка
     в раскладке календаря, и это был последний вид работ, зашитый в код. */
  {
    id: 'wt_note',
    code: 'note',
    title: 'Заметка',
    tone: 'NEUTRAL',
    icon: 'bill',
    sort: 70,
    onSite: false,
    dayLong: true,
  },
];
