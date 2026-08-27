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
import { notifyOrderRemoved, notifyOrderUpdated } from '@/server/notifications/orders';
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

    /* Смену статуса самим монтажником уведомлением не сопровождаем: он и
       есть адресат, а писать человеку о том, что он только что сделал, —
       шум. Владельцу это видно в наряде и в его истории. */
    return json(await setStatusByInstaller(id, session.userId, parsed.data.status));
  }

  const parsed = orderUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  /* 🔴 Снимок «до» — владельческий, во всей полноте: разница, посчитанная по
     урезанной карточке, молча потеряла бы часть вводных. Кого и о чём
     уведомить — включая переназначение и отмену — разбирает сама
     `notifyOrderUpdated` (ADR-119). */
  const before = await findById(id, { role: 'owner', userId: session.userId });

  const updated = await update(id, parsed.data, session.userId);
  if (before !== null) await notifyOrderUpdated(before, updated);

  return json(updated);
});

export const DELETE = withOwner(async (_request, context: Context, session) => {
  const { id } = await context.params;

  /* Карточка нужна до удаления: после него сказать монтажнику, какой наряд
     отменён, будет нечем. */
  const order = await findById(id, { role: 'owner', userId: session.userId });

  await remove(id);
  if (order !== null) await notifyOrderRemoved(order);

  return noContent();
});
