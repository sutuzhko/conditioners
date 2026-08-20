import { OFFICE_PLACE_TYPE } from '@/entities/product/model';

/**
 * Контракт первого экрана.
 *
 * 🔴 Блок ничего не знает о базе: модели и цифры приходят пропсами, запрос
 * делает страница (docs/ORCHESTRATION.md, волна 3).
 */

/** Цифра полосы преимуществ: «1200+ установок в Туле». */
export type HeroStat = {
  /** Число, которое отсчитывает счётчик. */
  readonly value: number;
  /** Хвост после числа: «+», « года», « день». Склонение задаёт владелец данных. */
  readonly suffix?: string | undefined;
  readonly label: string;
};

/** Границы ползунка площади — из макета. */
export const AREA_MIN = 10;
export const AREA_MAX = 60;
export const AREA_DEFAULT = 25;

/**
 * Тип помещения. «Офис» берётся константой домена: по ней `pickByArea`
 * узнаёт, что нужен сдвиг на класс выше (docs/PROJECT.md §2.3).
 */
export const PLACE_TYPES = ['Квартира', 'Частный дом', OFFICE_PLACE_TYPE] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];
