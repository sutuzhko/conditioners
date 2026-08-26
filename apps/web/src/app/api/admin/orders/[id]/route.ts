/**
 * Карточка наряда — docs/API.md §13.
 *
 * 🔴 Правка расходится по ролям прямо здесь: владельцу — вся схема наряда,
 * монтажнику — только статус и только два его значения. Разбор перехода и
 * проверка «наряд назначен именно этому человеку» — в репозитории, вместе с
 * доступом к данным (CRM.md §6).
 */
import { orderInstallerUpdateSchema, orderUpdateSchema } from '@/entities/order/model';
import { isOwner } from '@/server/auth';
import {
  json,
  noContent,
  notFound,
  readJson,
  validationError,
  withAdmin,
  withOwner,
} from '@/server/http';
import { findById, remove, setStatusByInstaller, update } from '@/server/repo/orders';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/**
 * Чужой наряд монтажнику — `404`, а не `403`: репозиторий не находит его
 * вовсе, потому что существование чужого наряда монтажника не касается.
 */
export const GET = withAdmin(async (_request, context: Context, session) => {
  const { id } = await context.params;

  const order = await findById(id, { role: session.role, userId: session.userId });
  if (order === null) return notFound('Наряд');

  return json(order);
});

export const PATCH = withAdmin(async (request, context: Context, session) => {
  const { id } = await context.params;
  const body = await readJson(request);

  if (!isOwner(session)) {
    /* Монтажнику доступен только статус: схема отсекает и лишние поля, и
       переходы, которых ему не положено делать, — «Отказ» в том числе. */
    const parsed = orderInstallerUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    return json(await setStatusByInstaller(id, session.userId, parsed.data.status));
  }

  const parsed = orderUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return json(await update(id, parsed.data));
});

export const DELETE = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  await remove(id);
  return noContent();
});
