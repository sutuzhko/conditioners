// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Заметки о монтажнике: владельческий раздел, но адрес не должен врать о
 * проверке. Номера заметок у всех сотрудников из одного пространства, и
 * удаление по одному `noteId` означало бы, что второй сегмент адреса
 * декоративный.
 */
const fake = vi.hoisted(() => ({
  db: { installerNote: { deleteMany: vi.fn() } },
}));

vi.mock('@/server/db', () => ({ db: fake.db }));

import { ApiException } from '@/server/http';
import { removeNote } from './admin-users';

beforeEach(() => {
  vi.clearAllMocks();
  fake.db.installerNote.deleteMany.mockResolvedValue({ count: 1 });
});

describe('удаление заметки о монтажнике', () => {
  it('🔴 заметка ищется внутри своего сотрудника, а не по одному номеру', async () => {
    await removeNote('u2', 'n1');

    expect(fake.db.installerNote.deleteMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'u2' },
    });
  });

  it('🔴 чужая заметка не удаляется: ничего не нашлось — «не найдена»', async () => {
    fake.db.installerNote.deleteMany.mockResolvedValue({ count: 0 });

    await expect(removeNote('u3', 'n1')).rejects.toBeInstanceOf(ApiException);
    await expect(removeNote('u3', 'n1')).rejects.toMatchObject({ code: 'not_found' });
  });
});
