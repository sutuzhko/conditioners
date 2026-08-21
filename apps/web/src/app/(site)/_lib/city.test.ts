import { describe, expect, it } from 'vitest';

import { cityPrepositional, inCity } from './city';

describe('склонение города в предложный падеж', () => {
  it('склоняет женский род на «-а»', () => {
    expect(cityPrepositional('Тула')).toBe('Туле');
    expect(cityPrepositional('Москва')).toBe('Москве');
  });

  it('склоняет мужской род на согласную', () => {
    expect(cityPrepositional('Новомосковск')).toBe('Новомосковске');
    expect(cityPrepositional('Алексин')).toBe('Алексине');
  });

  it('различает мягкий знак женского и мужского рода', () => {
    expect(cityPrepositional('Тверь')).toBe('Твери');
    expect(cityPrepositional('Ярославль')).toBe('Ярославле');
  });

  it('склоняет прилагательные в составе названия', () => {
    expect(cityPrepositional('Нижний Новгород')).toBe('Нижнем Новгороде');
    expect(cityPrepositional('Грозный')).toBe('Грозном');
  });

  it('оставляет несклоняемые названия как есть', () => {
    expect(cityPrepositional('Сочи')).toBe('Сочи');
    expect(cityPrepositional('Иваново')).toBe('Иваново');
  });

  it('не искажает названия с дефисом', () => {
    expect(cityPrepositional('Ростов-на-Дону')).toBe('Ростов-на-Дону');
  });

  it('пустой город остаётся пустым — выдумывать его нельзя', () => {
    expect(cityPrepositional('  ')).toBe('');
    expect(inCity('')).toBe('');
  });

  it('готовый хвост заголовка собирается с предлогом', () => {
    expect(inCity('Тула')).toBe(' в Туле');
  });
});
