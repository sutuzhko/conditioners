// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  NOTIFICATION_AUDIENCE,
  addressFor,
  audienceOf,
  hasAnyAddress,
  preferredChannel,
  toDeliveryAddresses,
} from './recipients';

describe('Таблица «роль × вид события»', () => {
  it('🔴 заявка, отзыв и напоминание о ТО остаются владельцу', () => {
    expect(audienceOf('lead')).toBe('owner');
    expect(audienceOf('review')).toBe('owner');
    expect(audienceOf('to-reminder')).toBe('owner');
  });

  it('🔴 всё про наряд уходит тому, кому наряд назначен', () => {
    expect(audienceOf('order-assigned')).toBe('assignee');
    expect(audienceOf('order-changed')).toBe('assignee');
    expect(audienceOf('order-cancelled')).toBe('assignee');
  });

  it('таблица описывает каждый вид события ровно один раз', () => {
    const kinds = Object.keys(NOTIFICATION_AUDIENCE);

    expect(kinds).toHaveLength(new Set(kinds).size);
    expect(kinds).toHaveLength(6);
  });
});

describe('Адреса получателя', () => {
  it('пустая строка — это «не задано», а не адрес', () => {
    const addresses = toDeliveryAddresses({ telegramChatId: '  ', email: '' });

    expect(addresses).toEqual({ telegram: null, email: null });
    expect(hasAnyAddress(addresses)).toBe(false);
  });

  it('адрес берётся по имени канала, незнакомый канал адреса не имеет', () => {
    const addresses = toDeliveryAddresses({ telegramChatId: '551234567', email: 'd@example.test' });

    expect(addressFor('telegram', addresses)).toBe('551234567');
    expect(addressFor('email', addresses)).toBe('d@example.test');
    expect(addressFor('sms', addresses)).toBeNull();
    expect(hasAnyAddress(addresses)).toBe(true);
  });

  it('телеграм предпочтительнее почты: монтажник весь день с телефоном', () => {
    expect(preferredChannel(['email', 'telegram'])).toBe('telegram');
    expect(preferredChannel(['email'])).toBe('email');
    expect(preferredChannel([])).toBeNull();
  });
});
