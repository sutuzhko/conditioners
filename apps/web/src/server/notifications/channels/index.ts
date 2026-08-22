import { createEmailChannel } from './email';
import { createTelegramChannel } from './telegram';
import { loadNotificationPrefs, type NotificationPrefs } from '../prefs';
import type { ChannelRegistry } from '../types';

/**
 * Набор каналов доставки. Собирается на каждый вызов, а не один раз при импорте:
 * веб и воркер — разные процессы, и настройка канала должна читаться из
 * окружения того процесса, который в этот момент работает.
 *
 * Выбор владельца приходит отдельно от доступов: какие каналы включены и куда
 * писать — из админки, токен и пароль — из окружения (docs/API.md §5).
 */
export function createChannels(prefs: NotificationPrefs): ChannelRegistry {
  return {
    email: createEmailChannel(undefined, prefs.email),
    telegram: createTelegramChannel(undefined, prefs.telegram),
  };
}

/** Каналы, работающие прямо сейчас: только в них есть смысл ставить уведомление. */
export function enabledChannelNames(registry: ChannelRegistry): readonly string[] {
  return Object.entries(registry)
    .filter(([, channel]) => channel !== undefined && channel.isEnabled())
    .map(([name]) => name);
}

/**
 * Реестр и список рабочих каналов по текущим настройкам. Отдельная функция,
 * потому что настройки читаются из базы, а вызывают её и приём обращения, и
 * воркер, и страница админки.
 */
export async function resolveChannels(): Promise<{
  readonly registry: ChannelRegistry;
  readonly enabled: readonly string[];
}> {
  const registry = createChannels(await loadNotificationPrefs());
  return { registry, enabled: enabledChannelNames(registry) };
}
