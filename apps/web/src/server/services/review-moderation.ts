/**
 * Модерация отзыва: смена статуса и след, который она оставляет (ADR-345).
 *
 * 🔴 Граница слоёв здесь проведена так (ADR-142). Репозиторий остаётся
 * доступом к данным: он пишет статус, гасит поля отказа и отвечает, чем отзыв
 * был до правки, — всё это про одну таблицу. Порядок записей и то, что они
 * неразделимы, — правило, а не запрос: оно живёт здесь. Обработчику маршрута
 * не достаётся ни того, ни другого: его дело — тело запроса, разбор схемой и
 * код ответа.
 *
 * Прежде вся операция лежала в репозитории, и это было верно ровно до тех пор,
 * пока она состояла из одной записи. Со второй записью — событием журнала —
 * репозиторию пришлось бы открывать транзакцию и знать про журнал, то есть
 * перестать быть доступом к данным.
 */
import type { ActivityAction } from '@/entities/activity/model';
import type { ReviewModeration } from '@/entities/review/model';
import { db } from '@/server/db';
import * as reviews from '@/server/repo/reviews';
import type { ReviewDto } from '@/server/repo/reviews';
import { recordActivity } from '@/server/services/activity';

/**
 * Каким действием журнал называет переход.
 *
 * 🔴 Возврат на модерацию — это и есть «снятие с публикации»: другого способа
 * убрать отзыв с сайта, не отклонив его, у модератора нет (`entities/review`).
 * Названия действий разные, потому что разные и поводы, по которым в журнал
 * потом смотрят: «сняли, пока разбираемся» и «отклонили насовсем» — не одно и
 * то же.
 */
const ACTION_BY_STATUS: Record<ReviewModeration['status'], ActivityAction> = {
  approved: 'review.publish',
  pending: 'review.unpublish',
  rejected: 'review.reject',
  archived: 'review.archive',
};

export type ModerateReviewInput = {
  readonly id: string;
  readonly moderation: ReviewModeration;
  /**
   * Кто нажал. `null` — кнопка в Telegram: там нажимает телеграм-аккаунт, а не
   * учётная запись панели, и связывать событие не с кем.
   */
  readonly actorId: string | null;
};

/**
 * Сменить статус отзыва и записать это в журнал.
 *
 * 🔴 Обе записи — в одной транзакции. Не «после» и не «параллельно»: отзыв,
 * снятый с публикации без следа, — ровно тот случай, ради которого журнал и
 * заводился, а событие о снятии, которого не было, — ложь в журнале. Откат
 * не оставляет ни того, ни другого.
 *
 * 🔴 В событие уходит переход статуса, и только он. Ни текста отзыва, ни имени
 * автора, ни причины отказа: причина живёт у самого отзыва и читается оттуда
 * при показе (инвариант 12, ADR-345).
 */
export async function moderateReview(input: ModerateReviewInput): Promise<ReviewDto> {
  return db.$transaction(async (tx) => {
    const { review, from } = await reviews.setStatus(input.id, input.moderation, input.actorId, tx);

    await recordActivity(
      {
        actorId: input.actorId,
        action: ACTION_BY_STATUS[input.moderation.status],
        entity: 'review',
        entityId: review.id,
        changes: { status: { from, to: input.moderation.status } },
      },
      tx,
    );

    return review;
  });
}
