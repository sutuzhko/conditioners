import { describe, expect, it } from 'vitest';

import { DOC_NAME_FALLBACK, docDisplayName } from './documents';

describe('подпись документа наряда', () => {
  it('обычное имя остаётся как есть: по нему документ и ищут', () => {
    expect(docDisplayName('Договор 1059.pdf')).toBe('Договор 1059.pdf');
  });

  it('🔴 разделители пути вырезаются: подпись не должна выглядеть путём', () => {
    expect(docDisplayName('../../etc/passwd')).toBe('.. .. etc passwd');
    expect(docDisplayName('C:\\Users\\Иван\\акт.pdf')).toBe('C: Users Иван акт.pdf');
  });

  it('управляющие символы не доезжают до заголовка ответа', () => {
    expect(docDisplayName('акт\r\nX-Injected: 1')).toBe('акт X-Injected: 1');
  });

  it('пустое имя заменяется, а не оставляет строку без подписи', () => {
    expect(docDisplayName('   ')).toBe(DOC_NAME_FALLBACK);
    expect(docDisplayName(null)).toBe(DOC_NAME_FALLBACK);
  });

  it('слишком длинное имя обрезается', () => {
    expect(docDisplayName('а'.repeat(300))).toHaveLength(120);
  });
});
