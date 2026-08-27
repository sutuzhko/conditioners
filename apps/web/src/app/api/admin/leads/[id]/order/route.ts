/**
 * «Создать заказ» — обращение становится работой (docs/API.md §8, CRM.md §3.4).
 *
 * Один запрос делает ровно два шага, которые обязаны случиться вместе: заводит
 * (или находит по телефону) клиента и переводит обращение в работу. Двумя
 * запросами с клиента это разъезжалось бы при первом же обрыве связи — заявка
 * в работе без карточки человека или наоборот.
 *
 * 🔴 Наряд здесь не создаётся. Черновик открывается формой, и номер, который
 * владелец диктует клиенту по телефону, не тратится на промах мимо кнопки
 * (ADR-114: счётчик сквозной, дыр в нём быть не должно).
 */
import { json, withOwner } from '@/server/http';
import { fromLead } from '@/server/repo/clients';
import { startWork } from '@/server/repo/leads';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const POST = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  /* Сначала клиент: без него наряд не к кому привязать, и падение на этом
     шаге не должно оставить обращение в работе без карточки. */
  const { client, created } = await fromLead(id);
  const lead = await startWork(id);

  return json({ client, created, lead });
});
