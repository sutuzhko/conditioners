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
  /** Файла на диске нет: вместо снимка — рамка с объяснением (issue #662). */
  readonly missing?: boolean | undefined;
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
 *
 * 🔴 Пропавший файл рисуется рамкой, а не битой картинкой (issue #662). Есть
 * ли файл, знает сервер — он и передаёт `missing`: браузеру этот вопрос
 * задавать поздно, к моменту его ответа значок битого файла уже на экране.
 */
export function ReviewPhoto({ src, name, missing = false }: ReviewPhotoProps) {
  const [open, setOpen] = useState(false);

  /* 🔴 Не кнопка и не ссылка: открывать нечего, а живая ссылка «открыть в
     полный размер» вела бы в 404 — предложение, которое интерфейс заведомо не
     исполнит. Рамка того же размера, что и превью: снявшийся с диска файл не
     должен ещё и двигать карточку под курсором. */
  if (missing) {
    return (
      <div className={styles.gone} role="note">
        <span className={styles.goneTitle}>{texts.photoGone}</span>
        <span className={styles.goneNote}>{texts.photoGoneNote}</span>
      </div>
    );
  }

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
