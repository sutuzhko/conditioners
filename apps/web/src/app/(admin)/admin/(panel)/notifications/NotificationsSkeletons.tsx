import { FieldsSkeleton, LineSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';
import { notificationsPageContent as texts } from './content';

/**
 * Заготовки раздела: готовность каналов с формой и адреса с журналом.
 *
 * 🔴 Одни и те же и на переходе в раздел (`loading.tsx`), и на месте
 * асинхронного блока (`DataBlock`): две разные заготовки одного экрана
 * разошлись бы по высоте, и раскладка перестраивалась бы дважды (issue #334).
 */
export function ChannelsSkeleton() {
  return (
    <div className={styles.block}>
      <section className={styles.status}>
        {/* Заголовок и пояснение настоящие: они не зависят от данных. */}
        <h2 className={styles.statusTitle}>{texts.statusTitle}</h2>
        <p className={styles.statusHint}>{texts.statusHint}</p>

        <ul className={styles.list}>
          {Array.from({ length: 2 }, (_, index) => (
            <li className={styles.item} key={index}>
              <LineSkeleton width="min(260px, 70%)" />
            </li>
          ))}
        </ul>
      </section>

      <FieldsSkeleton fields={4} />
    </div>
  );
}

export function DeliverySkeleton() {
  return (
    <div className={styles.block}>
      <RowsSkeleton rows={2} height="140px" />
      <RowsSkeleton rows={3} height="76px" />
    </div>
  );
}
