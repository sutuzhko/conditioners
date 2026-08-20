/**
 * Заглушка воркера волны 0: контейнер должен подниматься до того, как появится
 * очередь. Полная реализация — агент C волны 1 (docs/ORCHESTRATION.md):
 * разбор очереди, экспоненциальные ретраи, каналы email и telegram.
 */
const INTERVAL_MS = 30_000;

async function tick(): Promise<void> {
  // здесь будет разбор Notification со статусом PENDING
}

async function main(): Promise<void> {
  console.error('Воркер уведомлений запущен (заглушка волны 0)');
  for (;;) {
    await tick();
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

void main();
