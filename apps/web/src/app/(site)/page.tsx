import { listVisible } from '@/server/repo/products';
import { productSchema } from '@/entities/product/model';
import { Hero } from '@/widgets/hero';
import { Catalog } from '@/widgets/catalog';
import { LEAD_ANCHOR } from '@/shared/config/nav';

/**
 * Главная. Собирается из блоков; данные читает страница и передаёт пропсами —
 * виджеты в базу не ходят (docs/ORCHESTRATION.md).
 */
export const revalidate = 3600;

export default async function HomePage() {
  // репозиторий отдаёт DTO контракта (даты строками), виджеты ждут доменный тип
  const products = (await listVisible()).map((dto) => productSchema.parse(dto));

  return (
    <>
      <Hero products={products} leadHref={LEAD_ANCHOR} catalogHref="#catalog" />
      <Catalog products={products} orderHref={LEAD_ANCHOR} />
    </>
  );
}
