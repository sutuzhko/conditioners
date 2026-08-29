/**
 * Разовый перенос снимков клиента в закрытое хранилище — ADR-171.
 *
 * До ADR-171 фото заявки и снимки наряда лежали в общем каталоге загрузок и
 * отдавались публичным `/api/media/{name}`. Новый код кладёт их в подкаталог
 * `protected` и хранит в колонке имя файла, а не адрес. Уже накопленные записи
 * этого не знают: без переноса панель покажет битую картинку, а старый адрес
 * останется рабочим — то есть дефект останется закрытым только для новых
 * снимков.
 *
 * Скрипт идемпотентен: перенесённую запись он узнаёт по тому, что в колонке
 * уже имя файла, и пропускает. Файл, которого нет на диске (том пересоздали,
 * снимок удалили руками), не выдумывается — запись остаётся как есть, а
 * причина печатается: чинить это данными, а не молча.
 *
 * Запуск:
 *   docker compose -f docker-compose.dev.yml exec -T web \
 *     pnpm --filter web exec tsx prisma/move-protected-media.ts
 */
import { access, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/data/uploads';
const PROTECTED_DIR = join(UPLOADS_DIR, 'protected');
const MEDIA_URL_PREFIX = '/api/media';

const FILENAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Имя файла из старого публичного адреса; `null` — значение уже перенесено или чужое. */
function filenameOfLegacy(value: string): string | null {
  if (!value.startsWith(`${MEDIA_URL_PREFIX}/`)) return null;

  const name = value.slice(MEDIA_URL_PREFIX.length + 1);
  return FILENAME.test(name) ? name : null;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

type Moved = { readonly moved: number; readonly skipped: number; readonly missing: number };

async function moveFile(name: string): Promise<'moved' | 'already' | 'missing'> {
  if (await exists(join(PROTECTED_DIR, name))) return 'already';
  if (!(await exists(join(UPLOADS_DIR, name)))) return 'missing';

  await rename(join(UPLOADS_DIR, name), join(PROTECTED_DIR, name));
  return 'moved';
}

async function moveLeads(): Promise<Moved> {
  const rows = await db.lead.findMany({
    where: { photo: { not: null } },
    select: { id: true, photo: true },
  });

  let moved = 0;
  let skipped = 0;
  let missing = 0;

  for (const row of rows) {
    const name = row.photo === null ? null : filenameOfLegacy(row.photo);
    if (name === null) {
      skipped += 1;
      continue;
    }

    const result = await moveFile(name);
    if (result === 'missing') {
      console.warn(`Заявка ${row.id}: файла ${name} нет на диске, запись не тронута`);
      missing += 1;
      continue;
    }

    await db.lead.update({ where: { id: row.id }, data: { photo: name } });
    moved += 1;
  }

  return { moved, skipped, missing };
}

async function movePhotos(): Promise<Moved> {
  const rows = await db.orderPhoto.findMany({ select: { id: true, url: true } });

  let moved = 0;
  let skipped = 0;
  let missing = 0;

  for (const row of rows) {
    const name = filenameOfLegacy(row.url);
    if (name === null) {
      skipped += 1;
      continue;
    }

    const result = await moveFile(name);
    if (result === 'missing') {
      console.warn(`Снимок наряда ${row.id}: файла ${name} нет на диске, запись не тронута`);
      missing += 1;
      continue;
    }

    await db.orderPhoto.update({ where: { id: row.id }, data: { url: name } });
    moved += 1;
  }

  return { moved, skipped, missing };
}

async function main(): Promise<void> {
  await mkdir(PROTECTED_DIR, { recursive: true });

  const leads = await moveLeads();
  const photos = await movePhotos();

  console.info(
    `Заявки: перенесено ${leads.moved}, уже перенесено ${leads.skipped}, без файла ${leads.missing}`,
  );
  console.info(
    `Наряды: перенесено ${photos.moved}, уже перенесено ${photos.skipped}, без файла ${photos.missing}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
