'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Modal } from '@/shared/ui';

import { reviewModerationContent as texts } from './content';
import styles from './ReviewPhoto.module.css';

export interface ReviewPhotoProps {
  readonly src: string;
  /** Имя автора: подпись окна и описание снимка. */
  readonly name: string;
}

/**
 * Фото к отзыву — с увеличением (issue #53).
 *
 * 🔴 Модератор решает по снимку, публиковать отзыв или нет, а в списке он
 * шириной 220px: разглядеть на нём аккуратность трассы или оставленный мусор
 * нельзя. Превью — кнопка, окно показывает снимок целиком.
 *
 * Внутри окна `fill` с `object-fit: contain`: настоящих размеров файла панель
 * не знает, а фиксированные `width`/`height` растянули бы вертикальный кадр в
 * горизонтальный.
 */
export function ReviewPhoto({ src, name }: ReviewPhotoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label={texts.photoOpen}
        onClick={() => setOpen(true)}
      >
        <Image
          className={styles.preview}
          src={src}
          alt={texts.photoAlt(name)}
          width={220}
          height={165}
        />
        <span className={styles.hint}>{texts.photoOpen}</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={texts.photoTitle(name)}
        closeLabel={texts.photoClose}
        size="lg"
      >
        <div className={styles.full}>
          <Image src={src} alt={texts.photoAlt(name)} fill sizes="(width < 900px) 100vw, 760px" />
        </div>
      </Modal>
    </>
  );
}
