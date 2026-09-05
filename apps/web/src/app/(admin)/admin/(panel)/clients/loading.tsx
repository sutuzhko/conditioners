import Link from 'next/link';

import { CLIENT_NEW_PATH, clientManagerContent as texts } from '@/features/client-manager';
import { Skeleton, buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Клиенты: шапка настоящая, строка счёта, карточка поиска и список —
 * заготовками по замеру готовой страницы (issue #334). Заголовок и кнопка не
 * зависят от данных, и только настоящие они дают ту же высоту при любом
 * переносе строк.
 */
export default function ClientsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: CLIENT_NEW_PATH }}>
            {texts.addOpen}
          </Link>
        </div>

        {/* Счёт базы приходит из базы: под строку резервируется её высота, а
            не рисуется полоса на месте заголовка. */}
        <Skeleton variant="text" width="16ch" />
      </header>

      {/* Плашка «Телефон — ключ», поиск и таблица: список стал таблицей
          (issue #602), и четыре карточки на его месте обещали бы другую
          геометрию. */}
      <Skeleton variant="block" className={styles.noticeSkeleton} />
      <Skeleton variant="block" className={styles.searchSkeleton} />
      <Skeleton variant="block" className={styles.rowSkeleton} />
    </div>
  );
}
