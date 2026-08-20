'use client';

import { useId } from 'react';

export interface FieldIdsInput {
  id?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
}

export interface FieldIds {
  fieldId: string;
  hintId: string | undefined;
  errorId: string | undefined;
  /** значение для aria-describedby: подсказка и ошибка одновременно */
  describedBy: string | undefined;
  invalid: boolean;
}

/**
 * Связывает подпись, подсказку и ошибку с самим контролом.
 * Без этого скринридер прочитает поле, но не скажет, что в нём не так.
 */
export function useFieldIds({ id, hint, error }: FieldIdsInput): FieldIds {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint === undefined ? undefined : `${fieldId}-hint`;
  const errorId = error === undefined ? undefined : `${fieldId}-error`;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return { fieldId, hintId, errorId, describedBy, invalid: error !== undefined };
}
