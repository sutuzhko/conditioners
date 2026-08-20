// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { slugify, uniqueSlug } from '@/server/repo/slug';

describe('слаг', () => {
  it('транслитерирует название в латиницу', () => {
    expect(slugify('Сплит-система 09')).toBe('split-sistema-09');
  });

  it('схлопывает разделители и не оставляет их по краям', () => {
    expect(slugify('  Щётка / Ёлка  ')).toBe('schetka-elka');
  });

  it('оставляет только строчные латинские буквы, цифры и дефис', () => {
    expect(slugify('Инвертор ИЛИ On/Off?')).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('уникальность слага', () => {
  it('свободный слаг остаётся как есть', async () => {
    const isTaken = vi.fn().mockResolvedValue(false);

    await expect(uniqueSlug('Сплит-система 09', isTaken)).resolves.toBe('split-sistema-09');
  });

  it('занятый получает числовой суффикс', async () => {
    const isTaken = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    await expect(uniqueSlug('Сплит-система 09', isTaken)).resolves.toBe('split-sistema-09-3');
  });

  it('название без латиницы и цифр не даёт пустой адрес', async () => {
    const isTaken = vi.fn().mockResolvedValue(false);

    await expect(uniqueSlug('«»— ', isTaken)).resolves.toBe('element');
  });
});
