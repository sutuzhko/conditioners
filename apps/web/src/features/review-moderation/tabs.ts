import type { TabLinkItem } from '@/shared/ui';

import { reviewModerationContent as texts } from './content';
import { REVIEW_TABS, reviewsHref, type ReviewTab } from './model';

/**
 * Вкладки модерации для ленты кита: «На модерации», «Опубликованные»,
 * «Отклонённые», «В архиве», «Все» (issue #584).
 *
 * 🔴 Собираются отдельной функцией, а не разметкой в разделе: тот же список
 * нужен и странице, и её заготовке `loading.tsx`, а высота ленты у них обязана
 * совпасть до пикселя — иначе содержимое прыгает в момент приезда данных
 * (ADR-239). Собранный в двух местах, он разъедется на первой же правке.
 *
 * 🔴 «В архиве» стоит вопреки макету (ADR-300, issue #514): он рисовался до
 * того, как стало ясно, что архив недостижим. Архивные не удаляются
 * (инвариант 7), значит их только больше, и добраться до отзыва, снятого
 * полгода назад, можно было лишь листая «Все» по восемь записей.
 */
export function reviewTabItems(): readonly TabLinkItem<ReviewTab>[] {
  return REVIEW_TABS.map((tab) => ({
    key: tab,
    title: texts.tabTitle(tab),
    href: reviewsHref(tab),
  }));
}
