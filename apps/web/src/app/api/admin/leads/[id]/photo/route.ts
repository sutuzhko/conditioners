/**
 * 🔴 Закрытая выдача снимка при заявке — ADR-171.
 *
 * К форме человек прикладывает фотографию своей комнаты: где стоять блоку, как
 * идёт стена. Это персональные данные ровно в той же мере, что и адрес в той
 * же заявке. До ADR-171 снимок отдавался публичным `/api/media/{name}` всякому,
 * кто знает имя файла.
 *
 * Заявки в панели видит только владелец (`withOwner`), поэтому и снимок —
 * тоже. Ответ помечен `private, no-store`: между панелью и браузером стоит
 * Caddy, и снимок в общем кеше — та же утечка, только отложенная.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { notFound, withOwner } from '@/server/http';
import { findPhotoFile } from '@/server/repo/leads';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;
  const photo = await findPhotoFile(id);

  try {
    const info = await stat(photo.path);
    if (!info.isFile()) return notFound('Файл');

    /* Приведение типа — то же единственное разрешённое, что и у открытой
       отдачи (ADR-108): `Readable.toWeb` даёт поток из `node:stream/web`, а
       `Response` ждёт одноимённый тип из lib.dom. */
    const stream = Readable.toWeb(createReadStream(photo.path)) as ReadableStream<Uint8Array>;

    return new Response(stream, {
      headers: {
        'Content-Type': photo.mime,
        'Content-Length': String(info.size),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return notFound('Файл');
  }
});
