import { Skeleton } from '@/shared/ui';

import styles from './loading.module.css';

/** Сколько карточек рисует скелетон: ряд на широком экране, экран на узком. */
const CARDS = 6;
const CHIPS = 4;

/**
 * Состояние перехода листинга Базы знаний.
 *
 * 🔴 Страница читает `searchParams` (рубрика), поэтому рендерится на каждый
 * запрос, а не отдаётся из ISR: нажатие на рубрику — полная навигация. Без
 * этого файла Next держит на экране прежний список, пока идёт ответ, и
 * нажатие выглядит непроизошедшим (CLAUDE.md: «каждый асинхронный блок данных
 * имеет скелетон»).
 */
export default function KnowledgeLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <Skeleton variant="block" width="min(420px, 70%)" height="38px" />
      <Skeleton variant="text" lines={2} width="min(620px, 90%)" />

      <div className={styles.chips}>
        {Array.from({ length: CHIPS }, (_, index) => (
          <Skeleton key={index} variant="block" width="120px" height="34px" />
        ))}
      </div>

      <div className={styles.grid}>
        {Array.from({ length: CARDS }, (_, index) => (
          <Skeleton key={index} variant="block" height="300px" />
        ))}
      </div>
    </div>
  );
}
