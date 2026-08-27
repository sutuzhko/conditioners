/** Удаление документа наряда — docs/API.md §13. Только владелец. */
import { noContent, withOwner } from '@/server/http';
import { removeDocument } from '@/server/repo/order-files';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; docId: string }> };

export const DELETE = withOwner(async (_request, context: Context) => {
  const { id, docId } = await context.params;

  await removeDocument(id, docId);

  return noContent();
});
