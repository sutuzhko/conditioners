/**
 * Приём обращений с сайта: заявка и напоминание о сезонном ТО.
 *
 * 🔴 Сервис — это бизнес-правило целиком и ни одной строки про HTTP: что
 * считается обращением, в каком порядке оно записывается и что делать, если
 * запись не удалась. Разбор тела формы, ловушка для ботов и ограничение
 * частоты остаются в обработчике маршрута — это свойства запроса, а не
 * обращения.
 *
 * Так правило «сначала база, потом уведомление» (инвариант 2, ADR-091)
 * оказывается записанным один раз. До этого оно жило в двух обработчиках
 * сразу, и третья форма скопировала бы его в третий раз.
 */
import type { Prisma } from '@prisma/client';
import type { LeadContext } from '@/entities/lead/model';
import { db } from '@/server/db';
import type { Tracking } from '@/server/intake/tracking';
import {
  DEFAULT_LEAD_TOPIC,
  TO_REMINDER_TOPIC,
  normalizePhone,
  type LeadFormInput,
  type ToReminderFormInput,
} from '@/server/intake/schemas';
import { enqueueNotification } from '@/server/notifications/queue';
import type { NotificationPayload } from '@/server/notifications/types';
import * as leads from '@/server/repo/leads';
import type { LeadDto } from '@/server/repo/leads';
import { deleteStoredImage, saveImage } from '@/server/uploads/store';

/** Имя в списке заявок: форма напоминания его не спрашивает, а колонка не должна быть пустой. */
const TO_REMINDER_NAME = 'Напоминание о ТО';

export type CreateLeadInput = {
  readonly form: LeadFormInput;
  readonly tracking: Tracking;
  readonly context: LeadContext | null;
  readonly photo: File | null;
};

export type CreateToReminderInput = {
  readonly form: ToReminderFormInput;
  readonly tracking: Tracking;
};

type OriginData = Pick<Prisma.LeadCreateInput, 'sourceUrl' | 'referrer' | 'utm' | 'consentAt'>;

/** Происхождение обращения и доказательство согласия — общие у всех форм. */
function originData(tracking: Tracking): OriginData {
  return {
    sourceUrl: tracking.sourceUrl,
    referrer: tracking.referrer,
    // без меток поле остаётся NULL, а не пустым объектом — в админке это разные вещи
    ...(tracking.utm === null ? {} : { utm: tracking.utm }),
    // 🔴 доказательство согласия по 152-ФЗ: фиксируем момент отправки формы
    consentAt: new Date(),
  };
}

/**
 * 🔴 Обращение и уведомление о нём — одна транзакция (ADR-091): падение между
 * двумя записями оставляло в базе заявку, о которой владелец не узнал бы
 * никогда. Уведомление собирается из уже записанного обращения, а не из того,
 * что прислала форма: воркеру нужен идентификатор, которого до записи нет.
 */
async function record(
  data: Prisma.LeadCreateInput,
  payloadOf: (lead: LeadDto) => NotificationPayload,
): Promise<LeadDto> {
  return db.$transaction(async (tx) => {
    const lead = await leads.create(data, tx);
    await enqueueNotification(payloadOf(lead), tx);

    return lead;
  });
}

/**
 * Заявка с сайта — главная ценность продукта.
 *
 * Фотография сохраняется до транзакции: класть файл на диск внутри неё значит
 * держать транзакцию открытой на время пережатия картинки. Плата за это —
 * компенсация: не удалась запись, файл остаётся сиротой, и его убирают руками
 * сервиса, а не крон-задачей «когда-нибудь».
 */
export async function createLead(input: CreateLeadInput): Promise<LeadDto> {
  const { form, tracking, context, photo } = input;
  const storedPhoto = photo === null ? null : (await saveImage(photo, 'photo')).url;

  try {
    return await record(
      {
        name: form.name,
        phone: normalizePhone(form.phone),
        // форма темы может не спрашивать — тогда это обращение за консультацией
        topic: form.topic ?? DEFAULT_LEAD_TOPIC,
        /* 🔴 То, что человек видел в поле «Модель» и подтвердил (ADR-129).
           Снимок контекста заполняется отдельно и может назвать ту же модель:
           одно — что человек делал, другое — что он подтвердил. */
        model: form.model ?? null,
        place: form.place ?? null,
        qty: form.qty ?? null,
        callTime: form.callTime ?? null,
        address: form.address ?? null,
        comment: form.comment ?? null,
        photo: storedPhoto,
        ...originData(tracking),
        // пустого снимка не бывает, бывает его отсутствие
        ...(context === null ? {} : { context }),
      },
      (lead) => ({
        kind: 'lead',
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        topic: lead.topic,
        model: lead.model,
        place: lead.place,
        qty: lead.qty,
        callTime: lead.callTime,
        address: lead.address,
        comment: lead.comment,
        photo: lead.photo,
        sourceUrl: lead.sourceUrl,
        /* Снимок уходит в уведомление из разобранного значения, а не из
           колонки: полезная нагрузка самодостаточна по построению, и
           `Prisma.JsonValue` в ней означал бы «разбирайся сам». */
        context,
      }),
    );
  } catch (error) {
    if (storedPhoto !== null) await deleteStoredImage(storedPhoto);
    throw error;
  }
}

/**
 * Напоминание о сезонном ТО. Форма спрашивает только телефон и давность
 * установки, но это такое же обращение: телефон — персональные данные, значит
 * запись в базе и согласие обязательны, а владелец узнаёт о нём через ту же
 * очередь.
 */
export async function createToReminder(input: CreateToReminderInput): Promise<LeadDto> {
  const { form, tracking } = input;

  return record(
    {
      name: TO_REMINDER_NAME,
      phone: normalizePhone(form.phone),
      topic: TO_REMINDER_TOPIC,
      // «установили этим летом», «не помню, когда чистили» — это и есть срок,
      // от которого владелец считает, когда перезвонить
      comment: form.when ?? null,
      ...originData(tracking),
    },
    (lead) => ({
      kind: 'to-reminder',
      leadId: lead.id,
      phone: lead.phone,
      when: lead.comment,
    }),
  );
}
