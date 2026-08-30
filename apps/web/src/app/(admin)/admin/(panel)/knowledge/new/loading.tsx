import { FieldsSkeleton, HeadSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/**
 * Новая статья: заголовок и поля редактора.
 *
 * Скелетон нужен именно прямому заходу на адрес окна — ссылке из мессенджера,
 * обновлению страницы, открытию в новой вкладке: переход из списка перехватывает
 * окно, и там скелетон не показывается вовсе.
 */
export default function NewArticleLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />
      {/* Десять полей: заголовок, рубрика, дата, время чтения, анонс,
          публикация, текст, слаг и две строки SEO. */}
      <FieldsSkeleton fields={10} />
    </div>
  );
}
