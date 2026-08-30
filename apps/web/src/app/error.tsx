'use client';

import { useEffect } from 'react';

import { ERROR_PAGE_CONTENT as t } from '@/shared/config/error-page';
import { Button, ButtonLink } from '@/shared/ui';

import styles from './error.module.css';

/**
 * Запасной экран падения рендера: недоступная база, необработанное исключение
 * в серверном компоненте. До него страницы отдавали голый экран Next — без
 * объяснения и выхода (аудит 23 августа, BUGS).
 *
 * Границы ошибок в Next — клиентские компоненты, поэтому данных компании тут
 * нет и быть не может: телефон живёт в базе, а экран появляется ровно тогда,
 * когда она не отвечает. Остаются два честных действия — повторить и уйти на
 * главную.
 */
export default function RenderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // след в консоли браузера — единственное место, где ошибку видно с клиента
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <p className={styles.code}>{t.code}</p>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>

        <div className={styles.actions}>
          <Button size="lg" onClick={reset}>
            {t.retry}
          </Button>
          <ButtonLink href="/" size="lg" variant="bordered">
            {t.homeLink}
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
