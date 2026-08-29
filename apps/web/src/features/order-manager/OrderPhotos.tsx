'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Card, FileInput, Icon, IconButton, useConfirm, type Confirm } from '@/shared/ui';

import { PHOTO_STAGE_TITLE, orderManagerContent as texts } from './content';
import { photosOfStage, type OrderPhotoCard, type OrderWorkApi, type PhotoStage } from './model';
import styles from './OrderPhotos.module.css';

export interface OrderPhotosProps {
  readonly api: OrderWorkApi;
  readonly photos: readonly OrderPhotoCard[];
  /** Монтажник снимает только выполненные работы (docs/CRM.md §6). */
  readonly forInstaller?: boolean | undefined;
  readonly onChanged?: (() => void) | undefined;
  readonly confirmRemove?: Confirm | undefined;
}

/** Размер миниатюры. Числом: `next/image` требует ширину и высоту (инвариант 13). */
const THUMB = 148;

const STAGES: readonly PhotoStage[] = ['before', 'after'];

/**
 * Фотографии наряда: место установки и выполненные работы.
 *
 * 🔴 Этап решает, кто снимает. «До» грузит владелец — монтажник видит, куда
 * едет и что там за стена. «После» грузит монтажник — снимок остаётся в
 * истории клиента. У монтажника кнопки на «до» нет, но защита не в этом:
 * этап проверяет сервер (docs/CRM.md §6).
 */
export function OrderPhotos({
  api,
  photos,
  forInstaller = false,
  onChanged,
  confirmRemove,
}: OrderPhotosProps) {
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [busy, setBusy] = useState<PhotoStage | null>(null);
  const [message, setMessage] = useState('');

  const mayEdit = (stage: PhotoStage): boolean => !forInstaller || stage === 'after';

  const upload = async (stage: PhotoStage, file: File | null): Promise<void> => {
    if (file === null || busy !== null) return;

    setBusy(stage);
    setMessage('');

    const result = await api.addPhoto(stage, file);
    setBusy(null);

    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message);
  };

  const remove = async (photo: OrderPhotoCard): Promise<void> => {
    if (busy !== null) return;

    const confirmed = await ask({
      title: texts.photoRemoveAsk,
      description: texts.photoRemoveText,
      confirmLabel: texts.photoRemoveConfirm,
    });
    if (!confirmed) return;

    setBusy(photo.stage);
    setMessage('');

    const result = await api.removePhoto(photo.id);
    setBusy(null);

    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message);
  };

  return (
    <Card as="section" aria-labelledby="order-photos-title">
      <h2 className={styles.title} id="order-photos-title">
        {texts.photosTitle}
      </h2>
      <p className={styles.hint}>
        {forInstaller ? texts.photosHintInstaller : texts.photosHintOwner}
      </p>

      <div className={styles.stages}>
        {STAGES.map((stage) => {
          const stageTitle = PHOTO_STAGE_TITLE[stage];
          const shots = photosOfStage(photos, stage);

          return (
            <section className={styles.stage} key={stage}>
              <h3 className={styles.stageTitle}>{stageTitle}</h3>

              {shots.length === 0 ? (
                <p className={styles.empty}>{texts.photoEmpty}</p>
              ) : (
                <ul className={styles.grid}>
                  {shots.map((photo, index) => (
                    <li className={styles.item} key={photo.id}>
                      {/* 🔴 `unoptimized` — снимок отдаётся по сессии (ADR-171),
                          а оптимизатор ходит за картинкой сам, своим запросом с
                          сервера и без cookie панели: получает 401 и отдаёт
                          вместо снимка ошибку. */}
                      <Image
                        className={styles.thumb}
                        src={photo.url}
                        alt={texts.photoAlt(stageTitle, index + 1)}
                        width={THUMB}
                        height={THUMB}
                        unoptimized
                      />

                      {mayEdit(stage) ? (
                        <IconButton
                          className={styles.remove}
                          label={texts.photoRemove(stageTitle, index + 1)}
                          variant="ghost"
                          size="sm"
                          disabled={busy !== null}
                          icon={<Icon name="close" size={16} />}
                          onClick={() => void remove(photo)}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {mayEdit(stage) ? (
                <FileInput
                  label={texts.photoAdd(stageTitle)}
                  promptText={busy === stage ? texts.photoAdding : texts.photoAdd(stageTitle)}
                  disabled={busy !== null}
                  value={null}
                  onChange={(file) => void upload(stage, file)}
                />
              ) : null}
            </section>
          );
        })}
      </div>

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </Card>
  );
}
