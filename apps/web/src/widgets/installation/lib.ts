/**
 * Оценка экономии на электричестве: инвертор против обычного on/off.
 *
 * 🔴 Это оценка, а не расчёт по счётчику. Формула перенесена из прототипа
 * один в один и опирается на четыре допущения, вынесенные в `SAVINGS_MODEL`.
 * Ни одно из них не проверяется на конкретной квартире, поэтому у результата
 * в вёрстке всегда стоит «≈», а под блоком — оговорка (`savingsContent.
 * disclaimer`). Позиционирование сайта построено на честности сметы, и блок
 * про экономию не имеет права выглядеть точнее, чем он есть.
 *
 * Ставок и цен компании здесь нет: тариф на электричество задаёт сам
 * посетитель, а стоимость монтажа считает калькулятор цен (инвариант 8).
 */

/**
 * Допущения модели.
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

export type SavingsInput = {
  /** Сколько часов в сутки кондиционер работает. */
  readonly hoursPerDay: number;
  /** Тариф на электричество, ₽/кВт·ч. */
  readonly tariff: number;
};

export type SavingsEstimate = {
  /** Расход обычного on/off за сезон, ₽. */
  readonly usual: number;
  /** Расход инвертора за сезон, ₽. */
  readonly inverter: number;
  /** Разница за сезон, ₽. */
  readonly saved: number;
  /** Разница за `SAVINGS_MODEL.horizonYears` сезонов, ₽. */
  readonly savedOverHorizon: number;
  /**
   * Доля расхода инвертора от расхода on/off, 0…1. Возвращается, чтобы
   * длина полоски в вёрстке бралась из той же величины, что и цифры рядом,
   * а не из отдельно вписанных «62%».
   */
  readonly inverterShare: number;
};

/** Отрицательных часов и тарифов не бывает: ползунок их не даст, но функция публичная. */
function atLeastZero(value: number): number {
  return value > 0 ? value : 0;
}

/**
 * Расход за сезон и разница между ним у обычной и инверторной модели.
 *
 * Округления здесь нет намеренно: числа округляет форматирование при выводе,
 * а тесты сверяют формулу, а не её представление.
 */
export function estimateSavings({ hoursPerDay, tariff }: SavingsInput): SavingsEstimate {
  const { averagePowerKw, seasonDays, inverterShare, horizonYears } = SAVINGS_MODEL;

  const usual = averagePowerKw * atLeastZero(hoursPerDay) * seasonDays * atLeastZero(tariff);
  const inverter = usual * inverterShare;
  const saved = usual - inverter;

  return {
    usual,
    inverter,
    saved,
    savedOverHorizon: saved * horizonYears,
    inverterShare,
  };
}
