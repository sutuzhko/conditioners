import { noContent, withOwner } from '@/server/http';
import { removeNote } from '@/server/repo/admin-users';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; noteId: string }> };

export const DELETE = withOwner(async (_request, context: Context) => {
  const { noteId } = await context.params;
  await removeNote(noteId);
  return noContent();
});
