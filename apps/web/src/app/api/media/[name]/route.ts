/**
 * Отдача загруженных изображений.
 *
 * Файлы лежат в примонтированном томе вне каталога приложения (TECH_DECISIONS §9),
 * поэтому статикой Next их не отдать. Имя проверяется по маске сгенерированных
 * имён — обхода каталога через «../» быть не может.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { env } from '@/shared/config/env';
import { notFound, withRoute } from '@/server/http';
import { isSafeFilename, mimeFor } from '@/server/uploads/store';

export const dynamic = 'force-dynamic';

export const GET = withRoute(async (_request, context: { params: Promise<{ name: string }> }) => {
  const { name } = await context.params;
  if (!isSafeFilename(name)) return notFound('Файл');

  const path = join(env.UPLOADS_DIR, name);

  try {
    const info = await stat(path);
    if (!info.isFile()) return notFound('Файл');

    const stream = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>;

    return new Response(stream, {
      headers: {
        'Content-Type': mimeFor(name),
        'Content-Length': String(info.size),
        // Имя файла уникально и содержимое по нему не меняется.
        'Cache-Control': 'public, max-age=31536000, immutable',
        // контракт маршрута не должен зависеть от прокси: nosniff ставит и
        // Caddy, но прямой заход мимо него обязан быть так же безопасен
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return notFound('Файл');
  }
});
