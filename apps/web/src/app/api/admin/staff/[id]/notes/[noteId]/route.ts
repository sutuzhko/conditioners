import { noContent, withOwner } from '@/server/http';
import { removeNote } from '@/server/repo/admin-users';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; noteId: string }> };

export const DELETE = withOwner(async (_request, context: Context) => {
  const { id, noteId } = await context.params;
  // оба номера из адреса: заметка ищется внутри своего сотрудника
  await removeNote(id, noteId);
  return noContent();
});
