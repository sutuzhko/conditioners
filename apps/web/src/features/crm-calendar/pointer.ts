/**
 * Захват указателя при перетаскивании.
 *
 * Обёртки, а не прямые вызовы: захват указателя — часть Pointer Events, и в
 * jsdom его нет вовсе. Без проверки тесты сетки падали бы на подтверждённо
 * рабочем коде, а браузер получал бы ровно то же поведение.
 */
export function capturePointer(element: Element, pointerId: number): void {
  if (typeof element.setPointerCapture !== 'function') return;

  element.setPointerCapture(pointerId);
}

export function releasePointer(element: Element, pointerId: number): void {
  if (typeof element.hasPointerCapture !== 'function') return;
  if (!element.hasPointerCapture(pointerId)) return;

  element.releasePointerCapture(pointerId);
}
