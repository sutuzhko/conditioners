import type { Warranty } from '@/entities/settings/model';

/**
 * Фикстуры блока «Монтаж». Документируют, какие данные блок ждёт от страницы:
 * из базы он не читает ничего (docs/ORCHESTRATION.md, волна 3).
 */

/** Обе строки гарантии заполнены — так выглядят настроенные настройки. */
export const fullWarranty: Warranty = {
  installation: '3 года',
  equipment: '1 год',
};

/** Заполнена только гарантия на монтаж: типичное состояние на старте. */
export const installationOnlyWarranty: Warranty = {
  installation: '3 года',
  equipment: '',
};

/** Гарантия не заведена — строки в шаге не будет вовсе. */
export const emptyWarranty: Warranty = {
  installation: '',
  equipment: '',
};
