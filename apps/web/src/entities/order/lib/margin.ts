/**
 * Маржа наряда: сколько у компании осталось после выезда.
 *
 * `price − installerFee − материалы по движениям + deductionSum` — ADR-310,
 * требования в docs/CRM.md §8.2. До закупочной цены позиции склада маржу
 * считать было нечем, а разность «сумма минус выплата» ею не является:
 * материалы в монтаже — заметная доля, и такое число врало бы в большую
 * сторону ровно там, где владелец решает, какую цену ставить.
 *
 * 🔴 Функция чистая и живёт в `entities`, а не в компоненте: ошибка в цене
 * дороже ошибки в вёрстке, и проверяется она тестом, а не просмотром.
 *
 * 🔴 Роль здесь не проверяется — это арифметика, а не доступ. Кому маржу
 * показывать, решает сервер (`server/repo/orders.ts`, ADR-092): монтажник не
 * получает ни её, ни закупочных цен.
 */

/**
 * Движение материала по наряду.
 *
 * Только списание и возврат: приход, перемещение и инвентаризация наряда не
 * касаются и не могут — `orderId` есть лишь у этих двух видов (docs/API.md §14).
 */
export type MarginMaterial = {
  readonly kind: 'consume' | 'return';
  /** Количество, всегда положительное: направление задаёт вид движения. */
  readonly qty: number;
  /**
   * Закупочная цена единицы на момент движения, целые рубли.
   *
   * 🔴 `null` — цена позиции не была заведена, а не «материал бесплатный».
   * Ноль вместо неё занизил бы расход и завысил маржу, то есть соврал бы в
   * ту самую сторону, ради которой поле и вводится.
   */
  readonly unitCost: number | null;
};

/** Деньги наряда, из которых считается маржа. Целые рубли, как в схеме. */
export type MarginMoney = {
  readonly price: number;
  readonly installerFee: number;
  readonly deductionSum: number;
};

/**
 * Маржа посчитана либо целиком, либо никак.
 *
 * 🔴 Размеченное объединение, а не число с флагом: неполную маржу нельзя
 * случайно показать как обычную, если поле `value` у неё просто отсутствует.
 */
export type OrderMargin =
  | {
      readonly known: true;
      /** Расход материалов, целые рубли. */
      readonly materials: number;
      readonly value: number;
    }
  | {
      readonly known: false;
      /** Сколько движений ушло со склада без известной закупочной цены. */
      readonly unpriced: number;
    };

/**
 * Расход материалов наряда.
 *
 * 🔴 Округление одно и в конце. Количество дробное (три знака), цена целая,
 * и округление каждой строки копило бы ошибку: тридцать строк по половине
 * рубля — это пятнадцать рублей из воздуха.
 */
function materialsCost(materials: readonly MarginMaterial[]): number | null {
  let sum = 0;

  for (const material of materials) {
    /* 🔴 Неизвестная цена делает неизвестным весь расход, в какую бы сторону
       ни промахнулось её пропускание: пропущенное списание занижает расход,
       пропущенный возврат — завышает. Врут оба. */
    if (material.unitCost === null) return null;

    sum +=
      material.kind === 'consume'
        ? material.qty * material.unitCost
        : -material.qty * material.unitCost;
  }

  return Math.round(sum);
}

/** Сколько движений наряда ушло без закупочной цены. */
function unpricedCount(materials: readonly MarginMaterial[]): number {
  return materials.filter((material) => material.unitCost === null).length;
}

/**
 * Маржа наряда.
 *
 * Удержание прибавляется: это деньги, которые компания монтажнику не отдала,
 * а `installerFee` вычитается целиком, как начисленный (docs/CRM.md §9).
 */
export function orderMargin(money: MarginMoney, materials: readonly MarginMaterial[]): OrderMargin {
  const cost = materialsCost(materials);

  if (cost === null) return { known: false, unpriced: unpricedCount(materials) };

  return {
    known: true,
    materials: cost,
    value: money.price - money.installerFee - cost + money.deductionSum,
  };
}

/** Итог маржи за период: сумма и честный счёт того, что в неё не вошло. */
export type MarginTotal = {
  readonly value: number;
  /**
   * Сколько нарядов не попало в итог: расход у них есть, а цены у расхода нет.
   *
   * 🔴 Считается и показывается, а не замалчивается. Пустой итог из-за одного
   * наряда бесполезен, а итог, умолчавший о пропуске, — неверен: владелец
   * прочтёт его как полный.
   */
  readonly skipped: number;
};

/** Складывает посчитанные маржи, пропущенные — считает отдельно. */
export function totalMargin(margins: readonly OrderMargin[]): MarginTotal {
  let value = 0;
  let skipped = 0;

  for (const margin of margins) {
    if (margin.known) value += margin.value;
    else skipped += 1;
  }

  return { value, skipped };
}
