import { apiErrorSchema } from '@/shared/lib/api';

import { deliveryLogContent } from './content';

/** Адрес повтора доставки — docs/API.md §9. */
export const RETRY_ENDPOINT = '/api/admin/notifications';

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
