/** Правка заявки — контракт docs/API.md §8, §12. */
import { z } from 'zod';

import { leadStatusSchema } from '@/entities/lead/model';
import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { leadManagerContent as texts } from './content';
import type { LeadPatch, LeadToClientResult, LeadToOrderResult, LeadUpdateResult } from './model';

const REQUEST_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

export async function patchLead(id: string, patch: LeadPatch): Promise<LeadUpdateResult> {
  // общий разбор ответа (ADR-030): свои остаются только формулировки фичи
  const result = await adminRequest(`/api/admin/leads/${id}`, jsonInit('PATCH', patch), {
    ...REQUEST_TEXTS,
  });

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

/**
 * Ответ сервера приходит снаружи, значит разбирается схемой, а не приведением
 * типа: `created` управляет тем, что владелец прочитает на экране.
 */
const clientResultSchema = z.object({
  client: z.object({ id: z.string().min(1) }),
  created: z.boolean(),
});

/** «В клиенты»: обращение становится карточкой человека или привязывается к ней. */
export async function leadToClient(id: string): Promise<LeadToClientResult> {
  const result = await adminRequest(
    `/api/admin/leads/${id}/client`,
    jsonInit('POST'),
    REQUEST_TEXTS,
  );

  if (!result.ok) return { ok: false, message: result.message };

  const parsed = clientResultSchema.safeParse(result.payload);
  if (!parsed.success) return { ok: false, message: texts.serverError };

  return { ok: true, clientId: parsed.data.client.id, created: parsed.data.created };
}

/** Ответ «Создать заказ»: клиент для наряда и новый статус обращения. */
const orderStartSchema = z.object({
  client: z.object({ id: z.string().min(1) }),
  lead: z.object({ status: leadStatusSchema }),
});

/**
 * «Создать заказ»: клиент заводится или находится по телефону, обращение
 * уходит в работу. Черновик наряда открывает страница — сам наряд ещё не
 * создан, и номер на промах мимо кнопки не тратится.
 */
export async function leadToOrder(id: string): Promise<LeadToOrderResult> {
  const result = await adminRequest(
    `/api/admin/leads/${id}/order`,
    jsonInit('POST'),
    REQUEST_TEXTS,
  );

  if (!result.ok) return { ok: false, message: result.message };

  const parsed = orderStartSchema.safeParse(result.payload);
  if (!parsed.success) return { ok: false, message: texts.serverError };

  return { ok: true, clientId: parsed.data.client.id, status: parsed.data.lead.status };
}

/**
 * 🔴 Уничтожение обращения (152-ФЗ, issue #600).
 *
 * Отдельная функция, а не `patchLead` с флагом: удаление необратимо и
 * спрашивает подтверждение, а правка статуса — нет. Одно имя на два действия
 * с такой разницей в цене ошибки — приглашение перепутать.
 */
export async function removeLead(id: string): Promise<LeadUpdateResult> {
  const result = await adminRequest(`/api/admin/leads/${id}`, { method: 'DELETE' }, REQUEST_TEXTS);

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}
