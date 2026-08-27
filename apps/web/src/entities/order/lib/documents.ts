/**
 * Подпись документа наряда — то, что человек видит в списке.
 *
 * 🔴 Это именно подпись, а не имя файла на диске: имя на диске генерирует
 * сервер, и оригинальное не используется никогда (docs/CLAUDE.md,
 * «Безопасность»). Но подпись «7a3f…-…pdf» бесполезна владельцу, который ищет
 * договор среди пяти документов, поэтому исходное имя остаётся как метка —
 * очищенное от всего, что делает его похожим на путь.
 */

export const DOC_NAME_FALLBACK = 'Документ';

/** Длиннее в списке всё равно не читают, а в заголовке ответа — тем более. */
const MAX_LENGTH = 120;

/* Разделители путей и управляющие символы: с ними подпись выглядит как путь к
   файлу, а в заголовке `Content-Disposition` ещё и ломает разбор. */
const UNSAFE = /[\u0000-\u001f\u007f/\\]+/g;

export function docDisplayName(raw: string | null | undefined): string {
  const cleaned = (raw ?? '').replace(UNSAFE, ' ').replace(/\s+/g, ' ').trim();

  if (cleaned === '') return DOC_NAME_FALLBACK;

  return cleaned.length > MAX_LENGTH ? cleaned.slice(0, MAX_LENGTH).trim() : cleaned;
}
