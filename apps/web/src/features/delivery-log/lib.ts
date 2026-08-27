import { adminRequest, apiErrorSchema, jsonInit } from '@/shared/lib/api';

import { deliveryLogContent } from './content';
import type { AddressApi, AddressResult } from './model';

/** Адрес повтора доставки — docs/API.md §10. */
export const RETRY_ENDPOINT = '/api/admin/notifications';

/** Адреса доставки по людям — docs/API.md §10. */
export const RECIPIENTS_ENDPOINT = '/api/admin/notifications/recipients';

/**
 * Вернуть отказ в очередь. Ошибка сети — тоже результат, а не исключение:
 * страница обязана сказать, что повтор не состоялся.
 */
export async function retryDelivery(
  id: string,
): Promise<{ readonly ok: boolean; readonly message?: string }> {
  let response: Response;

  try {
    response = await fetch(`${RETRY_ENDPOINT}/${id}/retry`, { method: 'POST' });
  } catch {
    return { ok: false, message: deliveryLogContent.retryError };
  }

  if (response.ok) return { ok: true };

  const payload: unknown = await response.json().catch(() => undefined);
  const envelope = apiErrorSchema.safeParse(payload);

  return {
    ok: false,
    message: envelope.success ? envelope.data.error.message : deliveryLogContent.retryError,
  };
}

const ADDRESS_TEXTS = {
  network: deliveryLogContent.addressNetwork,
  server: deliveryLogContent.addressError,
  session: deliveryLogContent.addressSession,
} as const;

async function patchRecipient(id: string, body: unknown): Promise<AddressResult> {
  const result = await adminRequest(
    `${RECIPIENTS_ENDPOINT}/${id}`,
    jsonInit('PATCH', body),
    ADDRESS_TEXTS,
  );

  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

/**
 * Правка адресов доставки.
 *
 * Chat ID сюда не отправляется ни при каких условиях: его нельзя ввести
 * руками — он приходит от самого телеграма при привязке.
 */
export const addressApi: AddressApi = {
  saveEmail: (id, email) => patchRecipient(id, { email }),
  unbind: (id) => patchRecipient(id, { unbindTelegram: true }),
};
