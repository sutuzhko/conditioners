'use client';

import { useState } from 'react';

import { ReviewForm } from '@/features/review-form';
import { Button, Modal, type ButtonLinkHref } from '@/shared/ui';

import { reviewModalContent as t } from './content';
import { ReviewHints } from './ReviewHints';
import styles from './ReviewModal.module.css';

export interface ReviewModalProps {
  /** Адрес политики обработки персональных данных — уходит в форму. */
  readonly policyHref: ButtonLinkHref;
  /** Подпись кнопки, открывающей окно. */
  readonly label?: string | undefined;
  readonly className?: string | undefined;
}

/**
 * Кнопка «Оставить отзыв» и окно с формой (макет v2, «Модалка отзыва»).
 *
 * 🔴 Форма переехала в модальное окно, а не пропала: раздел отзывов —
 * витрина чужого опыта, и форма рядом с ней забирала половину ширины у самих
 * отзывов. Открывается она по явному действию, то есть тогда, когда человек
 * уже решил писать.
 *
 * Памятка «о чём полезно написать» живёт здесь же: подсказка нужна ровно в
 * момент заполнения, а не на странице у того, кто просто читает отзывы.
 */
export function ReviewModal({ policyHref, label = t.open, className }: ReviewModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t.title}
        description={t.description}
        size="lg"
      >
        {/* Памятка уходит в левую колонку самой формы: там же снимки, и
            ширина окна занята целиком, а не колонкой подсказок рядом с
            узкой формой. Заголовок и пояснение уже дало окно — форма их не
            повторяет. */}
        <ReviewForm
          policyHref={policyHref}
          chrome="bare"
          aside={<ReviewHints />}
          className={styles.form}
        />
      </Modal>
    </>
  );
}
