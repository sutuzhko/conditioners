/**
 * «В клиенты» — обращение становится карточкой человека (docs/API.md §12).
 *
 * 🔴 Действие ручное, а не автоматическое при приёме заявки. В постоянную базу
 * с адресами попадают те, с кем действительно работают: складывать туда
 * каждого, кто спросил цену, — и лишние персональные данные, и список, в
 * котором не найти настоящего клиента (ADR-105).
 */
import { json, withOwner } from '@/server/http';
import { fromLead } from '@/server/repo/clients';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const POST = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  const result = await fromLead(id);

  /* 201 — карточку завели, 200 — номер уже был в базе и к нему привязали ещё
     одно обращение. Различие видно и в теле: владельцу важно знать, что перед
     ним постоянный клиент, а не новый человек. */
  return json(result, result.created ? 201 : 200);
});
