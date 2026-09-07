import { describe, expect, it } from 'vitest';

import { verificationTokenOf } from './verification';

describe('Значение подтверждения прав (issue #679)', () => {
  it('🔴 целый тег и одно значение дают одинаковый результат', () => {
    const fromTag = verificationTokenOf(
      '<meta name="yandex-verification" content="a1b2c3d4e5f60718" />',
    );

    expect(fromTag).toBe('a1b2c3d4e5f60718');
    expect(verificationTokenOf('a1b2c3d4e5f60718')).toBe(fromTag);
  });

  it('тег Search Console разбирается тем же правилом', () => {
    expect(
      verificationTokenOf('<meta name="google-site-verification" content="Ab-1_cD.eF=" />'),
    ).toBe('Ab-1_cD.eF=');
  });

  it('кавычки бывают одинарными, а порядок атрибутов — любым', () => {
    expect(verificationTokenOf("<meta content='xyz789' name='yandex-verification'>")).toBe(
      'xyz789',
    );
  });

  it('лишние пробелы и переносы вокруг вставки не мешают', () => {
    expect(verificationTokenOf('\n  a1b2c3  \n')).toBe('a1b2c3');
  });

  it('пустое поле — рабочее состояние: тега просто не будет', () => {
    expect(verificationTokenOf('')).toBe('');
    expect(verificationTokenOf('   ')).toBe('');
  });

  it('🔴 разметка без content не принимается: иначе тег уедет внутрь тега', () => {
    expect(verificationTokenOf('<meta name="yandex-verification" />')).toBeNull();
  });

  it('значение с пробелом или кавычкой — это не токен, а вставлено не то', () => {
    expect(verificationTokenOf('abc 123')).toBeNull();
    expect(verificationTokenOf('"abc123"')).toBeNull();
  });

  it('пустой content — тоже отказ: сохранить его значит показать пустой тег', () => {
    expect(verificationTokenOf('<meta name="yandex-verification" content="" />')).toBeNull();
  });
});
