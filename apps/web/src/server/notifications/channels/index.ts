import { createEmailChannel } from './email';
import { createTelegramChannel } from './telegram';
import type { ChannelRegistry } from '../types';

/**
 * Набор каналов доставки. Собирается на каждый вызов, а не один раз при импорте:
 * веб и воркер — разные процессы, и настройка канала должна читаться из
 * окружения того процесса, который в этот момент работает.
 */
export function createChannels(): ChannelRegistry {
  return {
    email: createEmailChannel(),
    telegram: createTelegramChannel(),
  };
}

/** Каналы, настроенные прямо сейчас: только в них есть смысл ставить уведомление. */
export function enabledChannelNames(
  registry: ChannelRegistry = createChannels(),
): readonly string[] {
  return Object.entries(registry)
    .filter(([, channel]) => channel !== undefined && channel.isEnabled())
    .map(([name]) => name);
}
