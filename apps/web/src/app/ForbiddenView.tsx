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
export function ForbiddenView() {
  return (
    <main className={styles.page}>
      <ErrorDocumentAttrs />

      <div className={styles.container}>
        <p className={styles.code}>{t.code}</p>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>

        <ButtonLink href={t.workHref} size="lg" className={styles.action}>
          {t.workLink}
        </ButtonLink>
      </div>
    </main>
  );
}
