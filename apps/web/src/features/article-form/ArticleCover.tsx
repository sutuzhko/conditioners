'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Card, FileInput } from '@/shared/ui';

import { articleCoverContent as texts } from './content';

import styles from './ArticleCover.module.css';

export type CoverUpload = (file: File) => Promise<{ ok: boolean; message?: string }>;

export interface ArticleCoverProps {
  /** Текущая обложка. `null` — её нет. */
  readonly cover: string | null;
  readonly upload: CoverUpload;
  readonly onChanged?: (() => void) | undefined;
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
export function ArticleCover({ cover, upload, onChanged }: ArticleCoverProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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
        disabled={busy}
        onChange={(file) => void send(file)}
      />

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
    </Card>
  );
}
