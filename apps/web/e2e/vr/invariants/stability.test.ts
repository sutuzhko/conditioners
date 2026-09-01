import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TOLERANCE,
  describeDrift,
  parseStability,
  stabilityViolation,
  type ControlBox,
} from './stability';

const box = (top: number, left = 16, width = 294, height = 52): ControlBox => ({
  top,
  left,
  width,
  height,
});

describe('parseStability', () => {
  it('нет параметра — история устойчивость не объявляет', () => {
    expect(parseStability(undefined)).toBeNull();
    expect(parseStability(null)).toBeNull();
  });

  it('разбирает селектор, состояния и допуск по умолчанию', () => {
    expect(parseStability({ control: ' a[href*="#lead"] ', states: ['x--a', 'x--b'] })).toEqual({
      control: 'a[href*="#lead"]',
      states: ['x--a', 'x--b'],
      tolerance: DEFAULT_TOLERANCE,
    });
    expect(parseStability({ control: '#c', states: ['x--a'], tolerance: 0 })?.tolerance).toBe(0);
  });

  it('🔴 кривая форма — громкая ошибка, а не молчаливый пропуск проверки', () => {
    expect(() => parseStability('a[href]')).toThrow(/ожидается объект/);
    expect(() => parseStability({ states: ['x--a'] })).toThrow(/control/);
    expect(() => parseStability({ control: '#c', states: [] })).toThrow(/states/);
    expect(() => parseStability({ control: '#c', states: ['x--a', 3] })).toThrow(/states/);
    expect(() => parseStability({ control: '#c', states: ['x--a'], tolerance: -1 })).toThrow(
      /tolerance/,
    );
  });
});

describe('describeDrift', () => {
  it('в допуске — рамка стоит на месте', () => {
    expect(describeDrift(box(412), box(413), 'x--b', 1)).toBeNull();
    expect(describeDrift(box(412), box(412, 16, 294, 53), 'x--b', 1)).toBeNull();
  });

  it('называет сдвинувшиеся стороны числами и состояние', () => {
    expect(describeDrift(box(412), box(434), 'блоки-цены--pending', 1)).toBe(
      'верх 412 → 434 в состоянии блоки-цены--pending (допуск 1px)',
    );
    expect(describeDrift(box(412), box(412, 16, 188, 52), 'x--b', 1)).toBe(
      'ширина 294 → 188 в состоянии x--b (допуск 1px)',
    );
    expect(describeDrift(box(412), box(420, 20, 294, 52), 'x--b', 1)).toBe(
      'верх 412 → 420, лево 16 → 20 в состоянии x--b (допуск 1px)',
    );
  });

  it('нарушение уходит под правило stability с допущением истории', () => {
    expect(stabilityViolation('#c', 'верх 1 → 2 в состоянии x--b (допуск 1px)', null)).toEqual({
      rule: 'stability',
      element: '#c',
      detail: 'верх 1 → 2 в состоянии x--b (допуск 1px)',
      allowed: null,
    });
  });
});
