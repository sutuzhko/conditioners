import { PrismaClient } from '@prisma/client';

/*
 * В деве Next перезагружает модули на каждом изменении — без глобального
 * кеша это открывало бы новый пул соединений при каждой правке файла.
 *
 * Объявление, а не приведение `globalThis` (ADR-108): расширить глобальную
 * область TypeScript позволяет только `var`, зато тип клиента при этом
 * настоящий, а не результат двойного `as unknown as`.
 */
declare global {
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db;
