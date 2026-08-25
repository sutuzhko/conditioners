/** Заметки владельца о монтажнике. Сам монтажник их не видит — маршрут только для владельца. */
import { installerNoteSchema } from '@/entities/staff/model';
import { json, readJson, validationError, withOwner } from '@/server/http';
import { addNote, listNotes } from '@/server/repo/admin-users';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;
  return json(await listNotes(id));
});

export const POST = withOwner(async (request, context: Context) => {
  const { id } = await context.params;

  const parsed = installerNoteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await addNote(id, parsed.data.text), 201);
});
