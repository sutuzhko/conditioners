import { RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Заготовка журнала (ADR-239).
 *
 * 🔴 Одна и та же и на переходе в раздел (`loading.tsx`), и на месте
 * асинхронного блока (`DataBlock`): две разные заготовки одного экрана
 * разошлись бы по высоте, и раскладка перестраивалась бы дважды.
 *
 * Одна полоса, а не восемь: строки журнала лежат в общей карточке со своей
 * шапкой и разбивкой, и восемь отдельных прямоугольников обещали бы список из
 * восьми карточек — на широком экране их там нет.
 */
export function ActivitySkeleton() {
  return <RowsSkeleton rows={1} className={styles.journalSkeleton} />;
}
