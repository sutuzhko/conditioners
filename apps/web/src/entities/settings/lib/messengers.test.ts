import { describe, expect, it } from 'vitest';

import { contactsSchema, integrationsSchema } from '@/entities/settings/model';

import { messengerLinks } from './messengers';

/**
 * Настройки собираются схемами, а не литералами: так фикстура не разойдётся
 * со схемой при следующем поле, а умолчания приходят те же, что в базе.
 */
const contacts = (telegram: string, whatsapp: string) =>
  contactsSchema.parse({ telegram, whatsapp });

const flags = (telegram: boolean, whatsapp: boolean) =>
  integrationsSchema.parse({ messengerButtons: { telegram, whatsapp } });

describe('messengerLinks', () => {
  it('🔴 кнопки нет, пока переключатель выключен: адрес заполнен, но владелец её не включал', () => {
    expect(
      messengerLinks(contacts('https://t.me/tula', '79001234567'), flags(false, false)),
    ).toEqual([]);
  });

  it('🔴 включённая кнопка без адреса не показывается: ссылка в никуда хуже её отсутствия', () => {
    expect(messengerLinks(contacts('', '   '), flags(true, true))).toEqual([]);
  });

  it('готовый адрес уходит как есть', () => {
    expect(messengerLinks(contacts('https://t.me/tulaklimat', ''), flags(true, false))).toEqual([
      { kind: 'telegram', href: 'https://t.me/tulaklimat' },
    ]);
  });

  it('имя канала и запись без схемы приводятся к адресу', () => {
    expect(messengerLinks(contacts('@tulaklimat', ''), flags(true, false))).toEqual([
      { kind: 'telegram', href: 'https://t.me/tulaklimat' },
    ]);

    expect(messengerLinks(contacts('t.me/tulaklimat', ''), flags(true, false))).toEqual([
      { kind: 'telegram', href: 'https://t.me/tulaklimat' },
    ]);
  });

  it('🔴 номер WhatsApp приводится к цифрам: `wa.me` принимает только их', () => {
    expect(messengerLinks(contacts('', '+7 (910) 155-24-68'), flags(false, true))).toEqual([
      { kind: 'whatsapp', href: 'https://wa.me/79101552468' },
    ]);
  });

  it('нераспознанное значение кнопку не рождает', () => {
    expect(messengerLinks(contacts('спросите в офисе', '123'), flags(true, true))).toEqual([]);
  });

  it('порядок постоянный: Telegram первым', () => {
    const links = messengerLinks(contacts('@tula', '89101552468'), flags(true, true));

    expect(links.map((link) => link.kind)).toEqual(['telegram', 'whatsapp']);
  });
});
