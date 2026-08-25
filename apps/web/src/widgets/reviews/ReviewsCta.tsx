'use client';

import { ReviewForm } from '@/features/review-form';
import { ReviewModal } from '@/features/review-modal';
import type { ButtonLinkHref } from '@/shared/ui';

/**
 * Кнопка «Оставить отзыв» с окном и формой.
 *
 * Композиция «окно + форма» собирается в виджете (ADR-096: фичи друг о друге
 * не знают), но обязана жить в клиентском компоненте: слот `renderForm` —
 * функция, а функции не переживают границу сервер→клиент. Передача слота из
 * серверного `Reviews` роняла рендер всего лендинга — RSC честно отказывался
 * сериализовать функцию (найдено сквозным тестом).
 */
export function ReviewsCta({
  policyHref,
  className,
}: {
  readonly policyHref: ButtonLinkHref;
  readonly className?: string | undefined;
}) {
  return (
    <ReviewModal
      className={className}
      renderForm={(slot) => <ReviewForm policyHref={policyHref} {...slot} />}
    />
  );
}
