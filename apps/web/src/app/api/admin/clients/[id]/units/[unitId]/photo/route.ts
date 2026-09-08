/**
 * 🔴 Закрытая выдача снимка установки — ADR-171, issue #868.
 *
 * Техника клиента вырастает из выполненного монтажа и забирает с собой снимок
 * «после» — интерьер квартиры человека, то есть такие же персональные данные,
 * как адрес в его карточке рядом. В колонке лежит имя файла из закрытого
 * подкаталога, куда публичный `/api/media/{name}` не дотягивается; до этой
 * задачи имя уезжало в `<Image src>` карточки как есть и открыть снимок было
 * нельзя вовсе.
 *
 * База клиентов принадлежит владельцу целиком (`withOwner`, ADR-105):
 * монтажник получает адрес только со своим нарядом и в карточку клиента не
 * ходит. Ответ помечен `private, no-store` — между панелью и браузером стоит
 * Caddy, и снимок, осевший в общем кеше, это та же утечка, только отложенная.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { notFound, withOwner } from '@/server/http';
import { findPhotoFile } from '@/server/repo/client-units';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; unitId: string }> };

export const GET = withOwner(async (_request, context: Context) => {
  const { id, unitId } = await context.params;
  const photo = await findPhotoFile(id, unitId);

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
