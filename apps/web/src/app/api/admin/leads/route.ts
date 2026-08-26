/**
 * Заявки — docs/API.md §8. Внутренний раздел: на сайте не показывается нигде.
 */
import { apiError, json, withAdmin } from '@/server/http';
import { pageNumber } from '@/shared/lib/paging';
import { listByStatus, type LeadStatusApi } from '@/server/repo/leads';

export const dynamic = 'force-dynamic';

const STATUSES: readonly LeadStatusApi[] = ['new', 'in_progress', 'done', 'rejected'];

function isStatus(value: string): value is LeadStatusApi {
  return STATUSES.some((status) => status === value);
}

export const GET = withAdmin(async (request) => {
  const raw = request.nextUrl.searchParams.get('status');

  if (raw !== null && raw !== '' && !isStatus(raw)) {
    return apiError('validation_error', 'Неизвестный статус заявки', { field: 'status' });
  }

  const status = raw === null || raw === '' ? undefined : raw;
  const page = pageNumber(request.nextUrl.searchParams.get('page') ?? undefined);

  return json(await listByStatus({ status, page }));
});
