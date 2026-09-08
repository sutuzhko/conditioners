import { render, screen } from '@testing-library/react';
import { isValidElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 🔴 Проверка шва, а не компонента.
 *
 * `ActivityList` уже проверен фикстурами — и это ровно та форма проверки, при
 * которой раздел не собирался вовсе: фикстура написана по типу представления,
 * а страница кормит список тем, что вернул репозиторий. Разойдясь в одном поле,
 * два конца дают ошибку сборки, которой не видит ни один тест рендера.
 *
 * Поэтому здесь подменена только база: репозиторий, страница и список —
 * настоящие, и строка едет от `findMany` до текста на экране.
 */
const activityEvent = vi.hoisted(() => ({
  findMany: vi.fn<(args?: unknown) => Promise<unknown>>(),
  count: vi.fn<(args?: unknown) => Promise<number>>(),
}));

/* Отбор «Кто» читает учётные записи панели — это второй запрос раздела и
   второй кусок потока. Подменяется тем же способом: настоящий репозиторий,
   подменённая база. */
const adminUser = vi.hoisted(() => ({
  findMany: vi.fn<(args?: unknown) => Promise<unknown>>(),
}));

vi.mock('@/server/db', () => ({ db: { activityEvent, adminUser } }));

/* Страж возвращает сессию, как настоящий: страница ей не пользуется, но
   подмена, отдающая не тот тип, — это второй такой же шов. Через `vi.hoisted`,
   потому что подмены поднимаются выше объявлений файла. */
const owner = vi.hoisted(() => ({
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner' as const,
  expiresAt: new Date('2026-12-31'),
}));

vi.mock('@/server/guards', () => ({ requireOwnerPage: vi.fn(async () => owner) }));

import { ActivityList } from '@/features/activity-log';
import { requireOwnerPage } from '@/server/guards';
import { list } from '@/server/repo/activity';

import AdminActivityPage from './page';

const row = {
  id: 'a1',
  actorId: 'u1',
  actorKind: 'USER' as const,
  actor: { name: 'Богдан', login: 'owner' },
  action: 'review.unpublish',
  entity: 'review',
  entityId: 'r5',
  note: null,
  noteUpdatedAt: null,
  createdAt: new Date('2026-09-08T06:12:00Z'),
};

/* Сотрудник в том виде, в каком его читает `repo/admin-users`: раздел берёт из
   него только `id` и подпись — телефон и ИНН в клиентский `Select` не едут. */
const person = {
  id: 'u1',
  login: 'owner',
  name: 'Богдан',
  role: 'OWNER' as const,
  phone: null,
  active: true,
  employment: 'STAFF' as const,
  inn: null,
  telegramChatId: null,
  notifyEmail: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  lastLoginAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  activityEvent.findMany.mockResolvedValue([row]);
  activityEvent.count.mockResolvedValue(1);
  adminUser.findMany.mockResolvedValue([person]);
});

/**
 * Выполняет асинхронные блоки страницы — то же, что делает за неё React на
 * сервере. Список уехал в свой кусок потока и в базу ходит только тогда, когда
 * блок выполнят (тот же приём, что в `reviews/page.test.tsx`).
 */
async function drainBlocks(node: unknown, out: ReactElement[]): Promise<void> {
  if (Array.isArray(node)) {
    for (const child of node) await drainBlocks(child, out);
    return;
  }

  if (!isValidElement(node)) return;

  const element = node as ReactElement<{ children?: unknown }>;

  if (typeof element.type === 'function' && element.type.constructor.name === 'AsyncFunction') {
    const block = element.type as (props: unknown) => Promise<unknown>;
    const rendered = await block(element.props);
    /* Копим только то, что действительно можно отрисовать: тогда проверке не
       нужно приведение, а `as` в проекте запрещён. */
    if (isValidElement(rendered)) out.push(rendered);
    await drainBlocks(rendered, out);
    return;
  }

  await drainBlocks(element.props.children, out);
}

async function open(searchParams: Record<string, string> = {}): Promise<ReactElement[]> {
  const page = await AdminActivityPage({ searchParams: Promise.resolve(searchParams) });
  const blocks: ReactElement[] = [];
  await drainBlocks(page, blocks);

  return blocks;
}

describe('🔴 репозиторий и список сходятся формой', () => {
  /* Тест, которого не хватало: страница передаёт списку `Page<ActivityEventDto>`
     как есть, и если у представления другое имя поля автора — раздел не
     собирается. Фикстура этого не ловит, потому что написана по представлению. */
  it('строка из базы доезжает до экрана без преобразования', async () => {
    const journal = await list();

    render(<ActivityList journal={journal} />);

    expect(screen.getByText('Богдан')).toBeInTheDocument();
    expect(screen.getByText('Снятие отзыва с публикации')).toBeInTheDocument();
  });

  it('то же самое собирает и сама страница, а не только проверка', async () => {
    const [block] = await open();
    /* Сужение для компилятора, а не украшение: `expect(...).toBeDefined()`
       тип не сужает, и `render` получил бы `ReactElement | undefined`. */
    if (block === undefined) throw new Error('страница не вернула ни одного блока');

    render(block);

    expect(screen.getByText('Богдан')).toBeInTheDocument();
  });
});

describe('отбор доезжает из адреса до запроса', () => {
  /** Условия последнего запроса к журналу. */
  function lastWhere(): Record<string, unknown> {
    const call: unknown = activityEvent.findMany.mock.calls.at(-1)?.[0];
    if (typeof call !== 'object' || call === null || !('where' in call)) return {};

    const where: unknown = call.where;
    return typeof where === 'object' && where !== null ? { ...where } : {};
  }

  it('человек и период из адреса становятся условиями выборки', async () => {
    await open({ actor: 'u2', from: '2026-09-01', to: '2026-09-07' });

    expect(lastWhere()).toEqual({
      actorId: 'u2',
      createdAt: {
        gte: new Date('2026-08-31T21:00:00.000Z'),
        lt: new Date('2026-09-07T21:00:00.000Z'),
      },
    });
  });

  /* Адрес правят руками: мусор снимает условие, а не роняет раздел. */
  it('мусор в условии снимает его, а не роняет раздел', async () => {
    await open({ role: 'директор', from: '31 февраля' });

    expect(lastWhere()).toEqual({});
  });

  /* 🔴 Ряд отбора рисуется вне куска потока (issue #581): упавший журнал не
     должен уносить с экрана набранные условия. Отсюда и то, что список
     сотрудников читается до потока, а сам журнал — внутри него. */
  it('список сотрудников читается до потока, а журнал — внутри него', async () => {
    await AdminActivityPage({ searchParams: Promise.resolve({}) });

    expect(adminUser.findMany).toHaveBeenCalled();
    expect(activityEvent.findMany).not.toHaveBeenCalled();
  });
});

describe('журнал закрыт ролью', () => {
  /* 🔴 Проверка доступа стоит до первого чтения данных (ADR-095): у страницы
     без неё содержимое уезжает в теле ответа даже при отказе. */
  it('раздел спрашивает права раньше, чем идёт в базу', async () => {
    await AdminActivityPage({ searchParams: Promise.resolve({}) });

    expect(requireOwnerPage).toHaveBeenCalled();
    expect(activityEvent.findMany).not.toHaveBeenCalled();
  });
});

describe('номер страницы приходит из адреса', () => {
  it('мусор в параметре открывает первую страницу, а не роняет раздел', async () => {
    activityEvent.count.mockResolvedValue(40);

    await open({ page: 'вторая' });

    expect(activityEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });

  it('второй страницей раздел уходит за вторым окном выборки', async () => {
    activityEvent.count.mockResolvedValue(40);

    await open({ page: '2' });

    expect(activityEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 8 }));
  });
});
