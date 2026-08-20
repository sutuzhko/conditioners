/**
 * Публичный API блока «Сервис». Страница импортирует отсюда и при желании
 * передаёт свои разборы симптомов — сам блок в базу не ходит
 * (docs/ORCHESTRATION.md).
 */
export { Diagnostics } from './Diagnostics';
export type { DiagnosticsProps } from './Diagnostics';
export type { Symptom } from './model';
