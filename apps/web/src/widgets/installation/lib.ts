import { HOURS_IN_DAY, NIGHT_FROM, NIGHT_TO, type TariffMode } from './model';

/**
 * Оценка экономии на электричестве: инвертор против обычного on/off.
 *
 * 🔴 Это оценка, а не расчёт по счётчику. Формула перенесена из макета один в
 * один и опирается на допущения, вынесенные в `SAVINGS_MODEL`. Ни одно из них
 * не проверяется на конкретной квартире, поэтому у результата в вёрстке всегда
 * стоит «≈», допущения названы под управлением, а под блоком стоит оговорка
 * (`savingsContent.disclaimer`), которую рендерит сервер. Позиционирование
 * сайта построено на честности сметы, и блок про экономию не имеет права
 * выглядеть точнее, чем он есть.
 *
 * Ставок и цен компании здесь нет: тариф на электричество задаёт сам
 * посетитель, а стоимость монтажа считает калькулятор цен (инвариант 8).
 */

/**
 * Физические допущения оценки.
 *
 * `averagePowerKw` — средняя потребляемая мощность блока класса 09 за час
 * работы; `seasonDays` — длина сезона охлаждения; `inverterShare` — доля
 * расхода инвертора от расхода on/off: он не выключается и не запускается
 * заново, а держит обороты, и на этом выигрывает около 38%.
 */
export const SAVINGS_MODEL = {
  averagePowerKw: 0.75,
  seasonDays: 120,
  inverterShare: 0.62,
  /** Горизонт, на который блок показывает накопленную экономию. */
  horizonYears: 5,
} as const;

/**
 * Попадает ли час в ночную зону двухтарифного счётчика.
 *
 * Зона пересекает полночь, поэтому условие не диапазон, а объединение двух:
 * с 23:00 до конца суток и с начала суток до 07:00.
 */
export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_FROM || hour < NIGHT_TO;
}

export type SavingsInput = {
  /**
   * Отметки по часам суток: `hours[3] === true` — кондиционер работает с 03:00
   * до 04:00. Длина короче суток допустима — недостающие часы считаются
   * невыбранными.
   */
  readonly hours: readonly boolean[];
  /** Как считается электричество: единый тариф или день и ночь отдельно. */
  readonly mode: TariffMode;
  /** Дневной тариф, ₽/кВт·ч. В режиме `single` действует круглые сутки. */
  readonly tariffDay: number;
  /** Ночной тариф, ₽/кВт·ч. В режиме `single` в расчёте не участвует. */
  readonly tariffNight: number;
};

export type SavingsEstimate = {
  /** Отмеченные часы вне ночной зоны. */
  readonly dayHours: number;
  /** Отмеченные часы внутри ночной зоны. */
  readonly nightHours: number;
  /** Всего отмеченных часов в сутки. */
  readonly totalHours: number;
  /** Расход обычного on/off за сезон, ₽. */
  readonly usual: number;
  /** Расход инвертора за сезон, ₽. */
  readonly inverter: number;
  /** Разница за сезон, ₽. */
  readonly saved: number;
  /** Разница за `SAVINGS_MODEL.horizonYears` сезонов, ₽. */
  readonly savedOverHorizon: number;
  /**
   * Доля расхода инвертора от расхода on/off, 0…1. Возвращается, чтобы длина
   * полоски в вёрстке бралась из той же величины, что и цифры рядом, а не из
   * отдельно вписанных «62%».
   */
  readonly inverterShare: number;
};

/** Отрицательных тарифов не бывает: ползунок их не даст, но функция публичная. */
function atLeastZero(value: number): number {
  return value > 0 ? value : 0;
}

/**
 * Расход за сезон и разница между ним у обычной и инверторной модели.
 *
 * Округления здесь нет намеренно: числа округляет форматирование при выводе,
 * а тесты сверяют формулу, а не её представление.
 */
export function estimateSavings({
  hours,
  mode,
  tariffDay,
  tariffNight,
}: SavingsInput): SavingsEstimate {
  const { averagePowerKw, seasonDays, inverterShare, horizonYears } = SAVINGS_MODEL;

  let dayHours = 0;
  let nightHours = 0;
  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    if (hours[hour] !== true) continue;
    if (isNightHour(hour)) nightHours += 1;
    else dayHours += 1;
  }
  const totalHours = dayHours + nightHours;

  const day = atLeastZero(tariffDay);
  const night = atLeastZero(tariffNight);

  /* Стоимость киловатт-часов за сутки: в двухтарифном режиме ночные часы
     считаются по своей ставке, в едином — все часы по дневной. */
  const perDay = mode === 'dual' ? dayHours * day + nightHours * night : totalHours * day;

  const usual = averagePowerKw * seasonDays * perDay;
  const inverter = usual * inverterShare;
  const saved = usual - inverter;

  return {
    dayHours,
    nightHours,
    totalHours,
    usual,
    inverter,
    saved,
    savedOverHorizon: saved * horizonYears,
    inverterShare,
  };
}
