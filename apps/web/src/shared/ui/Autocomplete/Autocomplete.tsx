'use client';

import type { KeyboardEvent } from 'react';
import { useRef, useState } from 'react';

import { Field, type FieldVariant } from '../internal/Field';
import { controlClassName } from '../internal/controlClass';
import { useFieldIds } from '../internal/useFieldIds';
import styles from './Autocomplete.module.css';

export interface AutocompleteOption {
  readonly value: string;
  readonly label: string;
  /** Вторая строка подсказки: телефон клиента, специальность монтажника. */
  readonly note?: string | undefined;
}

export interface AutocompleteProps {
  readonly label?: string | undefined;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly variant?: FieldVariant | undefined;
  readonly options: readonly AutocompleteOption[];
  /** Текст в поле. Управляется снаружи: список приходит от поиска по нему. */
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  /** Выбор из списка. Отдаётся значением, а не подписью. */
  readonly onSelect: (option: AutocompleteOption) => void;
  readonly placeholder?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly required?: boolean | undefined;
  /** Что показать, когда подходящих нет. Пустой список молча — это поломка. */
  readonly emptyText?: string | undefined;
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly className?: string | undefined;
}

/**
 * Автодополнение: выбор клиента и монтажника в наряде (issue #331).
 *
 * 🔴 Разметка — `combobox` по ARIA 1.2: поле несёт `role="combobox"`,
 * `aria-expanded`, `aria-controls` и `aria-activedescendant`, список —
 * `role="listbox"`, пункты — `role="option"`. Фокус при этом остаётся в поле:
 * человек продолжает печатать, пока стрелки ходят по списку. Перенос фокуса
 * в список ломает набор и озвучивается как уход со страницы.
 *
 * 🔴 Клавиши: стрелки ведут по списку с переносом по кругу, Enter выбирает
 * подсвеченный пункт, Esc закрывает список, не стирая набранное. Esc,
 * стирающий текст, — самая обидная потеря работы в форме наряда.
 *
 * Список приходит снаружи уже отфильтрованным: искать по клиенту в базе из
 * тысячи записей должен сервер, а не компонент.
 */
export function Autocomplete({
  label,
  hint,
  error,
  variant,
  options,
  query,
  onQueryChange,
  onSelect,
  placeholder,
  disabled,
  required,
  emptyText = 'Ничего не найдено',
  id,
  name,
  className,
}: AutocompleteProps) {
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({ id, hint, error });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = `${fieldId}-list`;
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const activeOption = options[active];
  const expanded = open && (options.length > 0 || query.length > 0);

  const choose = (option: AutocompleteOption) => {
    onSelect(option);
    setOpen(false);
  };

  const move = (step: 1 | -1) => {
    if (options.length === 0) return;
    setActive((current) => (current + step + options.length) % options.length);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter' && open && activeOption !== undefined) {
      event.preventDefault();
      choose(activeOption);
      return;
    }

    /* 🔴 Esc закрывает список и оставляет набранное. Стирать текст здесь
       нельзя: человек набирал фамилию клиента, а не открывал список. */
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Field
      fieldId={fieldId}
      label={label}
      hint={hint}
      hintId={hintId}
      error={error}
      errorId={errorId}
      required={required}
      labelInside
      variant={variant}
      className={className}
    >
      <div className={styles.shell}>
        <input
          id={fieldId}
          name={name}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            expanded && activeOption !== undefined ? `${fieldId}-${activeOption.value}` : undefined
          }
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={controlClassName({
            variant,
            invalid,
            labelled: label !== undefined,
            own: [styles.input],
          })}
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          /* Закрытие откладывается на тик: нажатие на пункт списка сначала
             снимает фокус с поля, и без задержки список успевал исчезнуть
             раньше, чем щелчок до него доходил. */
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
        />

        {/* Список присутствует в разметке всегда, когда открыт, и скрывается
            целиком — а не отдельными пунктами: половина списка, спрятанная
            стилями, остаётся в дереве доступности и озвучивается. */}
        {expanded ? (
          <ul className={styles.list} id={listId} role="listbox" aria-label={label}>
            {options.length === 0 ? (
              <li className={styles.empty} role="presentation">
                {emptyText}
              </li>
            ) : (
              options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${fieldId}-${option.value}`}
                  role="option"
                  aria-selected={index === active}
                  className={[styles.option, index === active ? styles.active : null]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => {
                    /* `mousedown`, а не `click`: щелчок приходит после
                       `blur`, и к тому моменту список уже закрыт. */
                    event.preventDefault();
                    clearTimeout(blurTimer.current);
                    choose(option);
                  }}
                >
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.note === undefined ? null : (
                    <span className={styles.optionNote}>{option.note}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
