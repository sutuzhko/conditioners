/**
 * Занятость в календаре — docs/API.md §9.
 *
 * Список открыт обеим ролям: монтажник заводит и снимает свою занятость сам —
 * это его врач и его дела. Чью занятость он увидит, решает репозиторий, там же,
 * где стоит отбор по человеку.
 *
 * Ревалидации здесь нет: календарь на публичных страницах не показывается.
 */
import { dayBlockCreateSchema } from '@/entities/crm/model';
import { json, readJson, validationError, withAdmin } from '@/server/http';
import { create, listRange } from '@/server/repo/day-blocks';
import { gridRange, monthKeyOf, parseMonthKey } from '@/shared/lib/calendar';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (request, _context, session) => {
  const month = request.nextUrl.searchParams.get('month');
  /* Незнакомый месяц — это текущий, а не 400: адрес правят руками и присылают
     друг другу, и отказ вместо календаря там ничего не объясняет. */
  const chosen = (month === null ? null : parseMonthKey(month)) ?? monthKeyOf(new Date());
  const { from, to } = gridRange(chosen);

  return json(await listRange({ role: session.role, userId: session.userId }, from, to));
});

export const POST = withAdmin(async (request, _context, session) => {
  const parsed = dayBlockCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await create({ role: session.role, userId: session.userId }, parsed.data), 201);
});
