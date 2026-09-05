import { FieldsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Заготовка прайса: две карточки полей — строки классов и ставки допработ.
 *
 * 🔴 Одна и та же и на переходе в раздел (`loading.tsx`), и на месте
 * асинхронного блока (`DataBlock`): две разные заготовки одного экрана
 * разошлись бы по высоте, и раскладка перестраивалась бы дважды.
 */
export function PricesSkeleton() {
  return (
    <div className={styles.skeleton}>
      <FieldsSkeleton fields={6} />
      <FieldsSkeleton fields={4} />
    </div>
  );
}
