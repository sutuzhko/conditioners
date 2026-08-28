import type {
  InstallRates,
  InstallationEstimate,
  InstallationInput,
  InstallationLine,
} from '../model';

/**
 * Смета монтажа. Формула — PROJECT §2.4:
 *
 *   итог = ( база(класс)
 *          + max(0, трасса − включённые метры) × trassaPerM
 *          + (этаж от heightFloorFrom ? heightWorks : 0)
 *          + (штробление ? трасса × shtrobPerM : 0)
 *          ) × количество
 *
 * Чистая функция: ни одной зашитой цифры, все ставки приходят аргументом.
 * То, что здесь посчитано, клиент увидит в калькуляторе и услышит по телефону,
 * поэтому та же функция вызывается на сервере при приёме заявки.
 */
export function calculateInstallation(
  input: InstallationInput,
  rates: InstallRates,
): InstallationEstimate {
  const lines: InstallationLine[] = [{ kind: 'base', amount: input.basePrice }];

  const extraMeters = Math.max(0, input.trassaM - rates.trassaIncludedM);
  if (extraMeters > 0 && rates.trassaPerM > 0) {
    lines.push({
      kind: 'trassa',
      meters: extraMeters,
      rate: rates.trassaPerM,
      amount: extraMeters * rates.trassaPerM,
    });
  }

  if (input.floor >= rates.heightFloorFrom && rates.heightWorks > 0) {
    lines.push({ kind: 'height', amount: rates.heightWorks });
  }

  // Штробится вся трасса целиком, а не только метры сверх включённых.
  if (input.shtroblenie && input.trassaM > 0 && rates.shtrobPerM > 0) {
    lines.push({
      kind: 'shtroblenie',
      meters: input.trassaM,
      rate: rates.shtrobPerM,
      amount: input.trassaM * rates.shtrobPerM,
    });
  }

  const perUnit = lines.reduce((sum, line) => sum + line.amount, 0);

  return {
    lines,
    perUnit,
    qty: input.qty,
    total: perUnit * input.qty,
  };
}
