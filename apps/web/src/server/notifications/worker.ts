import { db } from '@/server/db';
import { dropOlderThan } from '@/server/repo/rate-limit';
import { resolveChannels } from './channels';
import { processDueNotifications } from './runner';

/**
 * Воркер очереди уведомлений. Запускается командой `pnpm worker` в отдельном
 * контейнере с тем же образом: перезапуск веба не рвёт доставку
 * (docs/TECH_DECISIONS.md §5).
 */
const INTERVAL_MS = 30_000;

/** Отработавшие окна счётчика частоты держим сутки — дольше они ни на что не влияют. */
const RATE_LIMIT_TTL_MS = 24 * 60 * 60_000;
const CLEANUP_EVERY_TICKS = 120;

let ticks = 0;

async function tick(): Promise<void> {
  const result = await processDueNotifications();
  if (result.sent > 0 || result.retried > 0 || result.failed > 0) {
    console.warn(
      `Очередь: отправлено ${result.sent}, к повтору ${result.retried}, отказов ${result.failed}`,
    );
  }

  ticks += 1;
  if (ticks % CLEANUP_EVERY_TICKS === 0) {
    await dropOlderThan(new Date(Date.now() - RATE_LIMIT_TTL_MS));
  }
}

async function main(): Promise<void> {
  const { enabled: channels } = await resolveChannels();
  console.warn(
    channels.length === 0
      ? 'Воркер уведомлений запущен, но ни один канал не настроен — обращения будут копиться в базе'
      : `Воркер уведомлений запущен, каналы: ${channels.join(', ')}`,
  );

  let running = true;
  const stop = (): void => {
    running = false;
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  while (running) {
    try {
      await tick();
    } catch (error) {
      // Цикл не должен умирать от единичного сбоя: упавший воркер — это
      // молчащая очередь и владелец, который не узнал о заявке.
      console.error('Сбой при разборе очереди уведомлений', error);
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  await db.$disconnect();
}

void main();
