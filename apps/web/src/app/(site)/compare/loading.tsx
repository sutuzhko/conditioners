import { CatalogCompareSkeleton } from '@/widgets/catalog';

/**
 * Сравнение на время перехода.
 *
 * Страница читает `?compare=` и рендерится динамически: снятие отметки —
 * обычная навигация, и без скелетона она проходит без признаков жизни.
 */
export default function CompareLoading() {
  return <CatalogCompareSkeleton />;
}
