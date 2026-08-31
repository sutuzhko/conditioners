import { describe, expect, it } from 'vitest';

import { PAD, VIEW, pathOf, pointAt, scaleOf, ticksOf } from './geometry';

const week = (id: string, points: readonly number[]) => ({ id, name: id, points });

describe('Шкала графика', () => {
  /* 🔴 Шкала от нуля, а не от минимума ряда. Начатая от минимума, она
     превращает разницу в 2% в скачок во весь график — ровно тот приём, за
     который сайт ругает конкурентов в разделе про обман. */
  it('включает ноль, когда все значения положительные', () => {
    expect(scaleOf([week('a', [100, 102, 104])])).toEqual({ min: 0, max: 104 });
  });

  it('уходит ниже нуля, когда в данных есть отрицательные', () => {
    expect(scaleOf([week('a', [-20, 10])])).toEqual({ min: -20, max: 10 });
  });

  it('считается по обеим сериям сразу, а не по первой', () => {
    const scale = scaleOf([week('a', [10, 20]), week('b', [5, 90])]);
    expect(scale.max).toBe(90);
  });

  /* Плоский ряд дал бы нулевую высоту шкалы и деление на ноль. */
  it('не схлопывается на ряде из одинаковых значений', () => {
    const scale = scaleOf([week('a', [50, 50, 50])]);
    expect(scale.max).toBeGreaterThan(scale.min);
  });

  it('пустые данные дают рабочую шкалу, а не NaN', () => {
    expect(scaleOf([])).toEqual({ min: 0, max: 1 });
  });
});

describe('Координаты точек', () => {
  const scale = { min: 0, max: 100 };

  it('первая точка стоит на левом поле', () => {
    expect(pointAt(0, 0, 3, scale).x).toBe(PAD.left);
  });

  it('последняя точка стоит на правом поле — за него график не выходит', () => {
    expect(pointAt(2, 0, 3, scale).x).toBeCloseTo(VIEW.width - PAD.right, 5);
  });

  it('максимум ложится на верхнее поле, минимум — на нижнее', () => {
    expect(pointAt(0, 100, 3, scale).y).toBeCloseTo(PAD.top, 5);
    expect(pointAt(0, 0, 3, scale).y).toBeCloseTo(VIEW.height - PAD.bottom, 5);
  });

  /* Единственная точка ставится в начало шкалы: график из одной недели должен
     читаться как «данных на одну неделю», а не как линия через весь холст. */
  it('единственная точка стоит в начале шкалы', () => {
    expect(pointAt(0, 50, 1, scale).x).toBe(PAD.left);
  });
});

describe('Ломаная', () => {
  it('начинается с переноса и продолжается линиями', () => {
    const path = pathOf([0, 50, 100], { min: 0, max: 100 });

    expect(path.startsWith('M')).toBe(true);
    expect(path.match(/L/g)).toHaveLength(2);
  });

  it('пустой ряд даёт пустую ломаную, а не сломанный путь', () => {
    expect(pathOf([], { min: 0, max: 1 })).toBe('');
  });
});

describe('Отметки шкалы', () => {
  it('их три — низ, середина, верх', () => {
    expect(ticksOf({ min: 0, max: 100 })).toEqual([0, 50, 100]);
  });
});
