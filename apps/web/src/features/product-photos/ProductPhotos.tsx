'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Badge, Button, Card, FileInput, Input, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { productPhotosContent as texts } from './content';
import type { PhotoApi, PhotoItem } from './model';
import styles from './ProductPhotos.module.css';

export interface ProductPhotosProps {
  readonly photos: readonly PhotoItem[];
  readonly api: PhotoApi;
  /** Обновить страницу после успешной правки: список приходит с сервера. */
  readonly onChanged?: (() => void) | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/** Размер миниатюры. Задан числом: `next/image` требует ширину и высоту (инвариант 13). */
const THUMB = 132;

/**
 * Фотографии модели: загрузка, подпись, выбор главной, удаление.
 *
 * Состояние живёт на сервере — после каждой удачной правки страница
 * перечитывается. Держать локальную копию списка значит расходиться с базой
 * при первой же ошибке.
 */
export function ProductPhotos({ photos, api, onChanged, confirmRemove }: ProductPhotosProps) {
  /* Подтверждение — общий диалог кита (ADR-113); проп остаётся швом
     для тестов, чтобы не открывать окно ради проверки удаления. */
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  /** Подписи правятся локально: сохраняются они по уходу фокуса, а не по вводу. */
  const [alts, setAlts] = useState<Record<string, string>>({});

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>): Promise<void> => {
    setBusy(true);
    setMessage('');

    const result = await action();

    setBusy(false);
    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message ?? texts.serverError);
  };

  const upload = async (file: File | null): Promise<void> => {
    if (file === null) return;
    await run(() => api.upload(file));
  };

  const saveAlt = async (photo: PhotoItem): Promise<void> => {
    const next = alts[photo.id];
    if (next === undefined || next === (photo.alt ?? '')) return;

    /* Пустая подпись — это `null`, а не пустая строка: «подписи нет» и
       «подпись пустая» в разметке ведут себя по-разному. */
    await run(() => api.patch(photo.id, { alt: next.trim() === '' ? null : next.trim() }));
  };

  return (
    <Card as="section" aria-labelledby="photos-title">
      <h2 className={styles.title} id="photos-title">
        {texts.title}
      </h2>
      <p className={styles.hint}>{texts.hint}</p>

      {photos.length === 0 ? <p className={styles.empty}>{texts.empty}</p> : null}

      {photos.length === 0 ? null : (
        <ul className={styles.grid}>
          {photos.map((photo, index) => (
            <li className={styles.item} key={photo.id}>
              <div className={styles.thumbBox}>
                <Image
                  className={styles.thumb}
                  src={photo.url}
                  alt={photo.alt ?? texts.altEmpty}
                  width={THUMB}
                  height={THUMB}
                />
                {photo.isMain ? (
                  <Badge variant="accent" className={styles.mainBadge}>
                    {texts.main}
                  </Badge>
                ) : null}
              </div>

              <Input
                aria-label={texts.altLabel(index + 1)}
                placeholder={texts.alt}
                defaultValue={photo.alt ?? ''}
                disabled={busy}
                wrapperClassName={styles.alt}
                onChange={(event) =>
                  setAlts((prev) => ({ ...prev, [photo.id]: event.target.value }))
                }
                onBlur={() => void saveAlt(photo)}
              />

              <div className={styles.itemActions}>
                {photo.isMain ? null : (
                  <Button
                    type="button"
                    variant="light"
                    size="sm"
                    disabled={busy}
                    aria-label={texts.makeMainLabel(index + 1)}
                    onClick={() => void run(() => api.patch(photo.id, { isMain: true }))}
                  >
                    {texts.makeMain}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="light"
                  size="sm"
                  className={styles.remove}
                  disabled={busy}
                  aria-label={texts.removeLabel(index + 1)}
                  onClick={() => {
                    void (async () => {
                      if (!(await ask(texts.removeConfirm))) return;
                      await run(() => api.remove(photo.id));
                    })();
                  }}
                >
                  {texts.remove}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FileInput
        label={texts.add}
        hint={texts.altHint}
        accept={['image/jpeg', 'image/png', 'image/webp']}
        disabled={busy}
        onChange={(file) => void upload(file)}
      />

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </Card>
  );
}
