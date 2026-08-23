import { describe, expect, it } from 'vitest';

import { caretAfterMask, digitsBefore, isPhoneComplete, maskPhone, phoneBody } from './phone';

describe('maskPhone', () => {
  it('собирает номер по мере набора', () => {
    expect(maskPhone('9')).toBe('+7 (9');
    expect(maskPhone('912')).toBe('+7 (912)');
    expect(maskPhone('912345')).toBe('+7 (912) 345');
    expect(maskPhone('9123456789')).toBe('+7 (912) 345-67-89');
  });

  it('🔴 восьмёрка в начале — это код страны, а не первая цифра номера', () => {
    expect(maskPhone('89123456789')).toBe('+7 (912) 345-67-89');
    expect(maskPhone('79123456789')).toBe('+7 (912) 345-67-89');
    expect(maskPhone('+7 912 345 67 89')).toBe('+7 (912) 345-67-89');
  });

  it('лишние цифры отбрасываются: номер длиннее российского не бывает', () => {
    expect(maskPhone('891234567890000')).toBe('+7 (912) 345-67-89');
  });

  it('пустое поле остаётся пустым: маска не мешает начать сначала', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone('+7 (')).toBe('');
    expect(maskPhone('буквы')).toBe('');
  });

  it('🔴 хвост не дорисовывается подчёркиваниями: они уедут в буфер и в заявку', () => {
    expect(maskPhone('912')).not.toContain('_');
  });
});

describe('isPhoneComplete', () => {
  it('полный номер — одиннадцать цифр', () => {
    expect(isPhoneComplete('+7 (912) 345-67-89')).toBe(true);
    expect(isPhoneComplete('89123456789')).toBe(true);
  });

  it('недобранный номер полным не считается', () => {
    expect(isPhoneComplete('+7 (912) 345-67-8')).toBe(false);
    expect(isPhoneComplete('')).toBe(false);
  });
});

describe('phoneBody', () => {
  it('оставляет цифры без кода страны', () => {
    expect(phoneBody('+7 (912) 345-67-89')).toBe('9123456789');
    expect(phoneBody('8 912 345 67 89')).toBe('9123456789');
  });

  it('номер без кода страны сохраняется целиком', () => {
    expect(phoneBody('9123456789')).toBe('9123456789');
  });
});

describe('курсор при правке в середине', () => {
  it('встаёт после той же цифры, а не в середине разделителя', () => {
    const masked = '+7 (912) 345-67-89';

    // после трёх цифр курсор стоит за закрывающей скобкой
    expect(masked[caretAfterMask(masked, 3) - 1]).toBe('2');
    // после шести — за последней цифрой блока
    expect(masked[caretAfterMask(masked, 6) - 1]).toBe('5');
  });

  it('в конце значения остаётся в конце', () => {
    expect(caretAfterMask('+7 (912) 345-67-89', 10)).toBe('+7 (912) 345-67-89'.length);
  });

  it('считает цифры слева от курсора без кода страны', () => {
    expect(digitsBefore('+7 (912) 345-67-89', 7)).toBe(3);
    expect(digitsBefore('+7 (', 4)).toBe(0);
  });
});
