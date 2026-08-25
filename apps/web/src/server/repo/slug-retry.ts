import { Prisma } from '@prisma/client';

/**
 * Повтор при гонке подбора адреса.
 *
 * `freeSlug` работает по схеме «прочитал соседей → выбрал суффикс → записал»:
 * два одновременных создания с одинаковым именем выбирают один слаг, и второй
 * упирается в `@unique` (P2002) — раньше это превращалось в невнятный 500.
 * Повтор заново читает соседей, видит только что занятый адрес и берёт
 * следующий суффикс. Одного повтора достаточно: админов — единицы, а не
 * толпа, и вторая подряд гонка на одном имени практически невозможна.
 */
export async function withSlugRetry<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const isSlugRace =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
    if (!isSlugRace) throw error;
    return action();
  }
}
