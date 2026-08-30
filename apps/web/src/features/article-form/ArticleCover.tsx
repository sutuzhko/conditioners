'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Button, Card, FileInput, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { articleCoverContent as texts } from './content';

import styles from './ArticleCover.module.css';

export type CoverUpload = (file: File) => Promise<{ ok: boolean; message?: string }>;
export type CoverRemove = () => Promise<{ ok: boolean; message?: string }>;

export interface ArticleCoverProps {
  /** Текущая обложка. `null` — её нет. */
  readonly cover: string | null;
  readonly upload: CoverUpload;
  /** Снятие обложки. Не задано — кнопки нет: у новой статьи снимать нечего. */
  readonly remove?: CoverRemove | undefined;
  readonly onChanged?: (() => void) | undefined;
  /** Подмена вопроса в тестах и историях: настоящее окно ждёт живого нажатия. */
  readonly confirmRemove?: Confirm | undefined;
}

/** Ширина превью. Числом: `next/image` требует размеры (инвариант 13). */
const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 180;

/**
 * Обложка статьи.
 *
 * Отдельной ручкой и отдельным блоком, а не полем формы: это файл, и его
 * загрузка не должна ждать, пока владелец допишет текст статьи.
 */
export function ArticleCover({
  cover,
  upload,
  remove,
  onChanged,
  confirmRemove,
}: ArticleCoverProps) {
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState('');
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const send = async (file: File | null): Promise<void> => {
    if (file === null) return;

    setBusy(true);
    setMessage('');

    const result = await upload(file);

    setBusy(false);
    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message ?? texts.serverError);
  };

  const drop = async (): Promise<void> => {
    if (remove === undefined || removing) return;
    if (!(await ask(texts.removeConfirm))) return;

    setRemoving(true);
    setMessage('');

    const result = await remove();

    setRemoving(false);
    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message ?? texts.serverError);
  };

  return (
    <Card as="section" aria-labelledby="cover-title">
      <h2 className={styles.title} id="cover-title">
        {texts.title}
      </h2>
      <p className={styles.hint}>{texts.hint}</p>

      {cover === null ? (
        <p className={styles.empty}>{texts.empty}</p>
      ) : (
        <Image
          className={styles.preview}
          src={cover}
          alt={texts.previewAlt}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
        />
      )}

      <FileInput
        label={cover === null ? texts.add : texts.replace}
        accept={['image/jpeg', 'image/png', 'image/webp']}
        disabled={busy || removing}
        onChange={(file) => void send(file)}
      />

      {/* Кнопка появляется только при обложке: снимать нечего — нечего и
          показывать. Отказ, а не акцент: действие разрушающее (BUGS). */}
      {cover === null || remove === undefined ? null : (
        <Button
          type="button"
          variant="light"
          className={styles.remove}
          loading={removing}
          disabled={busy}
          onClick={() => void drop()}
        >
          {removing ? texts.removing : texts.remove}
        </Button>
      )}

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </Card>
  );
}
