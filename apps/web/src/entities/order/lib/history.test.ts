import { describe, expect, it } from 'vitest';

import { orderAssignHistory, orderResultHistory, orderStatusHistory } from './history';

describe('записи истории наряда', () => {
  it('статус описывается делом, а не именем поля', () => {
    expect(orderStatusHistory('in_progress')).toBe('Взят в работу');
    expect(orderStatusHistory('done')).toBe('Выполнен');
    expect(orderStatusHistory('cancelled')).toBe('Отказ');
  });

  it('назначение называет человека', () => {
    expect(orderAssignHistory('Дмитрий Соколов')).toBe('Назначен: Дмитрий Соколов');
  });

  it('снятие исполнителя — своя запись, а не назначение пустоты', () => {
    expect(orderAssignHistory(null)).toBe('Исполнитель снят');
  });

  it('очистка итога тоже событие: отчёт исчез не сам по себе', () => {
    expect(orderResultHistory(true)).toBe('Заполнен итог работ');
    expect(orderResultHistory(false)).toBe('Итог работ очищен');
  });
});
