'use client';

import { Button, Checkbox, Input, Select } from '@/shared/ui';

import { EQUIP_TITLE, SOURCE_TITLE, orderManagerContent as texts } from './content';
import {
  ORDER_EQUIPS,
  UNIT_SOURCES,
  emptyUnitDraft,
  isOrderEquip,
  isUnitSource,
  type OrderUnitDraft,
} from './model';
import styles from './OrderUnits.module.css';

export interface OrderUnitsProps {
  readonly units: readonly OrderUnitDraft[];
  readonly onChange: (units: readonly OrderUnitDraft[]) => void;
  /** Форма отправляется: правку позиций нужно закрыть вместе с остальным. */
  readonly disabled?: boolean | undefined;
}

const EQUIP_OPTIONS = ORDER_EQUIPS.map((value) => ({ value, label: EQUIP_TITLE[value] }));
const SOURCE_OPTIONS = UNIT_SOURCES.map((value) => ({ value, label: SOURCE_TITLE[value] }));

/**
 * Позиции оборудования в наряде.
 *
 * 🔴 Список, а не одно поле: половина заказов — монтаж техники, купленной
 * клиентом самому себе, и в одном выезде встречаются два блока с разными
 * условиями — своя трасса, свой диаметр, своё штробление (CRM.md §3.3).
 * Одно поле «оборудование» заставило бы владельца писать это прозой, а
 * чеклист выезда собрать из прозы нельзя.
 */
export function OrderUnits({ units, onChange, disabled = false }: OrderUnitsProps) {
  const patch = (key: string, change: Partial<OrderUnitDraft>): void => {
    onChange(units.map((unit) => (unit.key === key ? { ...unit, ...change } : unit)));
  };

  const remove = (key: string): void => {
    onChange(units.filter((unit) => unit.key !== key));
  };

  const add = (): void => {
    onChange([...units, emptyUnitDraft()]);
  };

  return (
    <fieldset className={styles.root} disabled={disabled}>
      <legend className={styles.legend}>{texts.unitsTitle}</legend>
      <p className={styles.hint}>{texts.unitsHint}</p>

      {units.length === 0 ? (
        <p className={styles.empty}>{texts.unitsEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {units.map((unit, index) => (
            <li className={styles.item} key={unit.key}>
              <div className={styles.itemHead}>
                <span className={styles.itemTitle}>{texts.unitTitle(index + 1)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={styles.remove}
                  onClick={() => remove(unit.key)}
                >
                  {texts.unitRemove(index + 1)}
                </Button>
              </div>

              <div className={styles.grid}>
                <Select
                  label={texts.unitEquip}
                  options={EQUIP_OPTIONS}
                  value={unit.equip}
                  onChange={(event) => {
                    if (isOrderEquip(event.target.value))
                      patch(unit.key, { equip: event.target.value });
                  }}
                />

                <Input
                  label={texts.unitModel}
                  hint={texts.unitModelHint}
                  value={unit.model}
                  autoComplete="off"
                  wrapperClassName={styles.wide}
                  onChange={(event) => patch(unit.key, { model: event.target.value })}
                />

                <Select
                  label={texts.unitSource}
                  options={SOURCE_OPTIONS}
                  value={unit.source}
                  wrapperClassName={styles.wide}
                  onChange={(event) => {
                    if (isUnitSource(event.target.value))
                      patch(unit.key, { source: event.target.value });
                  }}
                />

                <Input
                  label={texts.unitTrassa}
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  value={unit.trassaM}
                  onChange={(event) => patch(unit.key, { trassaM: event.target.value })}
                />

                <Input
                  label={texts.unitDiameter}
                  hint={texts.unitDiameterHint}
                  value={unit.diameter}
                  autoComplete="off"
                  onChange={(event) => patch(unit.key, { diameter: event.target.value })}
                />

                <Checkbox
                  label={texts.unitShtrob}
                  checked={unit.shtrob}
                  wrapperClassName={styles.check}
                  onChange={(event) => patch(unit.key, { shtrob: event.target.checked })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.actions}>
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          {texts.unitAdd}
        </Button>
      </div>
    </fieldset>
  );
}
