'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Переносит содержимое в конец body. Нужно оверлеям: внутри секции с
 * transform или overflow модальное окно обрезалось бы родителем.
 *
 * Без состояния «смонтировано» намеренно: содержимое портала должно попасть
 * в DOM в том же коммите, что и сам оверлей, иначе эффект родителя не найдёт
 * ссылку на панель и фокус не уедет внутрь окна.
 */
export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}
