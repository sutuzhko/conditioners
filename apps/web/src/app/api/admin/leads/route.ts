/**
 * Заявки — docs/API.md §8. Внутренний раздел: на сайте не показывается нигде.
 */
import { apiError, json, withOwner } from '@/server/http';
import { pageNumber } from '@/shared/lib/paging';
import { listByStatus, type LeadStatusApi } from '@/server/repo/leads';

export const dynamic = 'force-dynamic';

const STATUSES: readonly LeadStatusApi[] = ['new', 'in_progress', 'done', 'rejected'];

function isStatus(value: string): value is LeadStatusApi {
  return STATUSES.some((status) => status === value);
}

export const GET = withOwner(async (request) => {
  const raw = request.nextUrl.searchParams.get('status');

  if (raw !== null && raw !== '' && !isStatus(raw)) {
    return apiError('validation_error', 'Неизвестный статус заявки', { field: 'status' });
  }

  const status = raw === null || raw === '' ? undefined : raw;
  const page = pageNumber(request.nextUrl.searchParams.get('page') ?? undefined);
  /* Поиск по очереди: имя, телефон, адрес и номер обращения. Пустая строка —
     это «без поиска», а не «найти пустоту». */
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  return json(await listByStatus({ status, page, query }));
});
