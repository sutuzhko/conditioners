import type { AdminRole } from '@/entities/staff/model';
import { ButtonLink } from '@/shared/ui';

import { ErrorDocumentAttrs } from './ErrorDocumentAttrs';
import { FORBIDDEN_CONTENT as t } from './forbidden-content';
import styles from './forbidden.module.css';

/**
 * Видимая часть страницы отказа.
 *
 * 🔴 Отказ бросает layout панели: он ждёт сессию из базы, то есть держит
 * каркас ответа, и оборвать его — единственный способ отдать честный 403
 * (issue #353). Ценой этого Next отдаёт свой служебный документ
 * `html#__next_error__` — без языка и без темы. Чинит это `ErrorDocumentAttrs`,
 * общий с 404 панели: см. его разбор.
 */
export function ForbiddenView({ role }: { role: AdminRole | null }) {
  /* 🔴 Выход берётся по роли (ADR-344): единственный адрес на всех отправлял
     менеджера на календарь выездов, то есть из отказа в отказ. `null` —
     сессия истекла между проверкой и отрисовкой; такому человеку зовут на
     вход. */
  const exit = role === null ? t.guest : t[role];

  return (
    <main className={styles.page}>
      <ErrorDocumentAttrs />

      <div className={styles.container}>
        <p className={styles.code}>{t.code}</p>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>

        {/* 🔴 `reload`, а не обычный переход. Отказ бросает раскладка панели, и
            она же — общий кусок дерева у всех её разделов: переход отсюда в
            соседний раздел переиспользует её из кеша роутера вместе с
            брошенным отказом. Адрес менялся на «Заявки», а страница
            оставалась «Раздел закрыт» — выход из тупика вёл в тот же тупик
            (issue #770). */}
        <ButtonLink href={exit.href} size="lg" className={styles.action} reload>
          {exit.label}
        </ButtonLink>
      </div>
    </main>
  );
}
