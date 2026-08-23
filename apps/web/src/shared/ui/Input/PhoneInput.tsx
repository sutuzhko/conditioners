'use client';

import { useRef, type ChangeEvent } from 'react';

import { PHONE_PLACEHOLDER, caretAfterMask, digitsBefore, maskPhone } from '@/shared/lib/phone';

import { Input, type InputProps } from './Input';

export interface PhoneInputProps extends Omit<InputProps, 'type' | 'inputMode' | 'onChange'> {
  readonly value: string;
  /** Наверх уходит уже размеченное значение: `+7 (912) 345-67-89`. */
  readonly onChange: (value: string) => void;
}

/**
 * Поле телефона с маской.
 *
 * 🔴 Маска ведёт, но не запирает: она приводит к общему виду то, что человек
 * набрал как привык — с восьмёркой, без кода, с пробелами. Отбрасывается
 * только заведомо лишнее (буквы и цифры сверх одиннадцати), а недобранный
 * номер поле принимает молча: ругаться на телефон в момент набора значит
 * мешать оставить заявку.
 *
 * Курсор считается по цифрам, а не по символам: маска добавляет скобки и
 * дефисы, и оставленный на месте курсор уезжает внутрь разделителя — правка в
 * середине номера превращается в борьбу с полем.
 */
export function PhoneInput({ value, onChange, placeholder, ...rest }: PhoneInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    const digits = digitsBefore(raw, caret);
    const masked = maskPhone(raw);

    onChange(masked);

    /* Значение перерисует React, поэтому курсор ставим после его отрисовки:
       иначе позиция достанется старому тексту и будет сброшена. */
    requestAnimationFrame(() => {
      const input = ref.current;
      if (input === null || document.activeElement !== input) return;

      const position = caretAfterMask(masked, digits);
      input.setSelectionRange(position, position);
    });
  };

  return (
    <Input
      {...rest}
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder ?? PHONE_PLACEHOLDER}
      value={value}
      onChange={handleChange}
    />
  );
}
