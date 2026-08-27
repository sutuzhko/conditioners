/**
 * 🔴 Закрытая выдача документа наряда — docs/CRM.md §9.
 *
 * Договоры и акты — персональные данные клиента. Публичный `/api/media/{name}`
 * отдаёт файл всякому, кто знает имя, и для них не годится: этот маршрут
 * сверяет и сессию (`withAdmin`), и принадлежность документа наряду,
 * доступному смотрящему, — монтажник получает файлы только своего наряда.
 *
 * Ответ помечен `private, no-store`: между панелью и браузером стоит Caddy, и
 * договор, осевший в общем кеше, — та же утечка, только отложенная.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { notFound, withAdmin } from '@/server/http';
import { findDocumentFile } from '@/server/repo/order-files';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; docId: string }> };

/**
 * Имя файла в заголовке — только в `filename*`: подпись русская, и по RFC 6266
 * её нельзя положить в `filename` без потери букв. Кавычек и переводов строки
 * в ней быть не может — подпись очищена доменом при загрузке (`docDisplayName`).
 */
function disposition(name: string): string {
  return `inline; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export const GET = withAdmin(async (_request, context: Context, session) => {
  const { id, docId } = await context.params;

  const doc = await findDocumentFile(id, docId, {
    role: session.role,
    userId: session.userId,
  });

  try {
    const info = await stat(doc.path);
    if (!info.isFile()) return notFound('Файл');

    /* Приведение типа — то же единственное разрешённое, что и у открытой
       отдачи (ADR-108): `Readable.toWeb` даёт поток из `node:stream/web`, а
       `Response` ждёт одноимённый тип из lib.dom. Читать документ в память
       нельзя: это договоры, и их бывает на десятки мегабайт. */
    const stream = Readable.toWeb(createReadStream(doc.path)) as ReadableStream<Uint8Array>;

    return new Response(stream, {
      headers: {
        'Content-Type': doc.mime,
        'Content-Length': String(info.size),
        'Content-Disposition': disposition(doc.name),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return notFound('Файл');
  }
});
