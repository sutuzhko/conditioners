/**
 * 🔴 Закрытая выдача снимка наряда — docs/CRM.md §9, ADR-171.
 *
 * Снимки «до» и «после» — это интерьер квартиры клиента, то есть такие же
 * персональные данные, как договор рядом. До ADR-171 они уходили через
 * публичный `/api/media/{name}`, и защитой служила неугадываемость имени
 * файла; договор при этом уже ходил через сессию. Асимметрия снята: маршрут
 * сверяет и сессию (`withAdmin`), и принадлежность снимка наряду, доступному
 * смотрящему, — монтажник получает фото только своего наряда.
 *
 * Ответ помечен `private, no-store`: между панелью и браузером стоит Caddy, и
 * снимок, осевший в общем кеше, — та же утечка, только отложенная.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { notFound, withAdmin } from '@/server/http';
import { findPhotoFile } from '@/server/repo/order-files';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; photoId: string }> };

export const GET = withAdmin(async (_request, context: Context, session) => {
  const { id, photoId } = await context.params;

  const photo = await findPhotoFile(id, photoId, {
    role: session.role,
    userId: session.userId,
  });

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
