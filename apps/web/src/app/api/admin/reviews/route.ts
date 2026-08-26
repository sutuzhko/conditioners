/**
 * Модерация отзывов — docs/API.md §7.
 *
 * 🔴 Инвариант 7: ни один эндпоинт этого раздела не изменяет текст отзыва.
 * Здесь только чтение списка по статусу.
 */
import { apiError, json, withAdmin } from '@/server/http';
import { listByStatus, type ReviewStatusApi } from '@/server/repo/reviews';

export const dynamic = 'force-dynamic';

const STATUSES: readonly ReviewStatusApi[] = ['pending', 'approved', 'rejected', 'archived'];

function isStatus(value: string): value is ReviewStatusApi {
  return STATUSES.some((status) => status === value);
}

export const GET = withAdmin(async (request) => {
  const raw = request.nextUrl.searchParams.get('status');

  if (raw !== null && raw !== '' && !isStatus(raw)) {
    return apiError('validation_error', 'Неизвестный статус отзыва', { field: 'status' });
  }

  const status = raw === null || raw === '' ? undefined : raw;
  return json(await listByStatus(status));
});
