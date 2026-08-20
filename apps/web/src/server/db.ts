import { PrismaClient } from '@prisma/client';

// В деве Next перезагружает модули на каждом изменении — без глобального
// кеша это открывало бы новый пул соединений при каждой правке файла.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
