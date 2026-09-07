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

vi.mock('@/server/db', () => ({ db: { activityEvent } }));

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
  createdAt: new Date('2026-09-08T06:12:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  activityEvent.findMany.mockResolvedValue([row]);
  activityEvent.count.mockResolvedValue(1);
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
