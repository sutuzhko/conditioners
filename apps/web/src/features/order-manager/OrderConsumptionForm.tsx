'use client';

import { useRef, useState, type FormEvent } from 'react';

import { Button, Input, Select } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import {
  consumptionFieldOf,
  consumptionQty,
  consumptionShortfall,
  emptyConsumptionDraft,
  findStockItem,
  isEquipmentItem,
  parseConsumptionDraft,
  zoneBalance,
  type ConsumptionDraft,
  type ConsumptionField,
  type ConsumptionHint,
  type ConsumptionLine,
  type OrderFormStatus,
  type OrderResult,
  type StockItemCard,
  type StockZoneCard,
} from './model';
import styles from './OrderConsumptionForm.module.css';

export interface OrderConsumptionFormProps {
  /** Справочник в том виде, в каком его прислал сервер: чужих зон здесь нет. */
  readonly items: readonly StockItemCard[];
  readonly zones: readonly StockZoneCard[];
  /** Ускоритель: пункты чеклиста, которым нашлась позиция склада. */
  readonly hints?: readonly ConsumptionHint[] | undefined;
  readonly onSubmit: (line: ConsumptionLine) => Promise<OrderResult>;
}

type FieldErrors = Partial<Record<ConsumptionField, string>>;

/** Позиция ищется по названию и по группе: «медь» находит и трубу, и фитинги. */
function matches(item: StockItemCard, query: string): boolean {
  if (query === '') return true;

  const needle = query.toLocaleLowerCase('ru-RU');
  return (
    item.name.toLocaleLowerCase('ru-RU').includes(needle) ||
    (item.group ?? '').toLocaleLowerCase('ru-RU').includes(needle)
  );
}

/**
 * Форма списания материала на наряд — docs/API.md §14.
 *
 * 🔴 Зона выбирается только тогда, когда есть из чего выбирать. Монтажнику
 * сервер присылает одну зону — его машину, — и `select` с единственным
 * пунктом был бы имитацией выбора: зон компании он не видит вовсе (ADR-134).
 *
 * 🔴 Уход в минус предупреждает, а не запрещает. Кнопка остаётся рабочей:
 * монтажник, у которого труба кончилась раньше, чем в системе, при запрете
 * впишет неправду, лишь бы закрыть наряд. Минус — сигнал провести
 * инвентаризацию, и это честнее (CRM.md §11.6).
 */
export function OrderConsumptionForm({
  items,
  zones,
  hints = [],
  onSubmit,
}: OrderConsumptionFormProps) {
  /* Единственная зона — не выбор, а факт: она же и подставляется в черновик. */
  const onlyZone = zones.length === 1 ? zones[0] : undefined;

  const qtyRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ConsumptionDraft>(() =>
    emptyConsumptionDraft(onlyZone?.id ?? ''),
  );
  const [query, setQuery] = useState('');
  const [state, setState] = useState<OrderFormStatus>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');

  const sending = state === 'sending';

  const selected = findStockItem(items, draft.itemId);
  const qty = consumptionQty(draft.qty);
  const shortfall = consumptionShortfall(selected, draft.fromZoneId, qty);

  const found = items.filter((item) => !item.archived && matches(item, query));
  /* Выбранная позиция остаётся в списке, даже когда поиск её прячет: иначе
     `select` показывает пустоту там, где выбор сделан. */
  const shown =
    selected === undefined || found.some((item) => item.id === selected.id)
      ? found
      : [selected, ...found];

  const itemOptions = shown.map((item) => ({
    value: item.id,
    label:
      draft.fromZoneId === ''
        ? item.name
        : `${item.name} — ${texts.qty(zoneBalance(item, draft.fromZoneId), item.unit)}`,
  }));

  const zoneOptions = zones.map((zone) => ({ value: zone.id, label: zone.name }));

  /* Правка любого поля гасит разбор прошлой отправки целиком: подсветка
     ошибки всегда одна, и оставлять её на соседнем поле незачем. */
  const set = <Key extends keyof ConsumptionDraft>(key: Key, value: string): void => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors({});
    setState('idle');
    setMessage('');
  };

  /** Подсказка чеклиста подставляет позицию и отдаёт курсор количеству. */
  const pick = (hint: ConsumptionHint): void => {
    set('itemId', hint.itemId);
    setQuery('');
    qtyRef.current?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    /* Клиентская проверка — доменной схемой склада, тем же объектом, что
       уедет на сервер: «1,5» и «12 000» разбираются одинаково здесь и там. */
    const parsed = parseConsumptionDraft(draft);
    if (!parsed.ok) {
      setState('error');
      if (parsed.field === null) setMessage(parsed.message === '' ? texts.invalid : parsed.message);
      else setErrors({ [parsed.field]: parsed.message });
      return;
    }

    setState('sending');
    setErrors({});
    setMessage('');

    const result = await onSubmit(parsed.line);

    if (result.ok) {
      setState('success');
      /* Зона остаётся: подряд списывают из одного места, и переспрашивать
         про машину на каждой строке значит мешать работать. */
      setDraft(emptyConsumptionDraft(draft.fromZoneId));
      setQuery('');
      return;
    }

    setState('error');

    /* Сервер называет поле путём внутри массива строк — подсветить нужно то же
       поле формы, что и при местной проверке. */
    const field = consumptionFieldOf(result.field);
    if (field === null) setMessage(result.message);
    else setErrors({ [field]: result.message });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h3 className={styles.title}>{texts.consumeTitle}</h3>

      {hints.length === 0 ? null : (
        <div className={styles.hints}>
          <p className={styles.hintsTitle}>{texts.consumeFromChecklist}</p>
          <p className={styles.hint}>{texts.consumeFromChecklistHint}</p>

          <ul className={styles.hintList}>
            {hints.map((hint) => (
              <li className={styles.hintItem} key={hint.itemId}>
                <Button
                  type="button"
                  size="sm"
                  variant="light"
                  className={styles.pick}
                  disabled={sending}
                  aria-label={texts.consumeHintLabel(hint.itemName)}
                  onClick={() => pick(hint)}
                >
                  {hint.itemName}
                </Button>

                {/* Пункт сборов виден рядом: человек должен узнать свою строку
                    из чеклиста, а не гадать, откуда взялась подсказка. */}
                <span className={styles.hintPoint}>{hint.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className={styles.fields} disabled={sending}>
        {onlyZone === undefined ? (
          <Select
            label={texts.consumeZone}
            options={zoneOptions}
            placeholder={texts.consumeZonePlaceholder}
            value={draft.fromZoneId}
            error={errors.fromZoneId}
            wrapperClassName={styles.wide}
            onChange={(event) => set('fromZoneId', event.target.value)}
          />
        ) : (
          <p className={styles.zone}>{texts.consumeZoneOnly(onlyZone.name)}</p>
        )}

        <Input
          label={texts.consumeSearch}
          hint={texts.consumeSearchHint}
          placeholder={texts.consumeSearchPlaceholder}
          type="search"
          value={query}
          autoComplete="off"
          wrapperClassName={styles.wide}
          onChange={(event) => setQuery(event.target.value)}
        />

        {itemOptions.length === 0 ? (
          <p className={styles.note}>
            {items.length === 0 ? texts.consumeItemsEmpty : texts.consumeNothingFound}
          </p>
        ) : (
          <Select
            label={texts.consumeItem}
            options={itemOptions}
            placeholder={texts.consumeItemPlaceholder}
            value={draft.itemId}
            error={errors.itemId}
            wrapperClassName={styles.wide}
            onChange={(event) => set('itemId', event.target.value)}
          />
        )}

        <Input
          ref={qtyRef}
          label={texts.consumeQty}
          hint={texts.consumeQtyHint}
          inputMode="decimal"
          value={draft.qty}
          error={errors.qty}
          autoComplete="off"
          wrapperClassName={styles.qty}
          onChange={(event) => set('qty', event.target.value)}
        />

        {/* Серийники спрашиваются только у техники: она ссылается на модель
            каталога, а у метра трассы номера нет (ADR-134). */}
        {isEquipmentItem(selected) ? (
          <Input
            label={texts.consumeSerials}
            hint={texts.consumeSerialsHint}
            value={draft.serials}
            error={errors.serials}
            autoComplete="off"
            wrapperClassName={styles.wide}
            onChange={(event) => set('serials', event.target.value)}
          />
        ) : null}
      </fieldset>

      {selected !== undefined && draft.fromZoneId !== '' ? (
        <p className={styles.balance}>
          {texts.consumeBalance(texts.qty(zoneBalance(selected, draft.fromZoneId), selected.unit))}
        </p>
      ) : null}

      {shortfall > 0 && selected !== undefined ? (
        <p className={styles.warning} role="status">
          {texts.consumeShortfall(texts.qty(shortfall, selected.unit))}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button type="submit" size="sm" disabled={sending} loading={sending}>
          {sending ? texts.consumeSending : texts.consumeSubmit}
        </Button>

        {state === 'success' ? (
          <span className={styles.ok} role="status">
            {texts.consumeDone}
          </span>
        ) : null}
      </div>

      {state === 'error' && message !== '' ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
