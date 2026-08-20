import { listVisible } from '@/server/repo/products';
import { getPrices } from '@/server/repo/prices';
import { getAll } from '@/server/repo/settings';
import { productSchema } from '@/entities/product/model';
import { priceRowSchema } from '@/entities/price/model';
import { settingSchemas } from '@/entities/settings/model';
import { Hero } from '@/widgets/hero';
import { TrustStrip, Services, WhyUs } from '@/widgets/trust';
import { Catalog } from '@/widgets/catalog';
import { SavingsBlock, StepsTimeline } from '@/widgets/installation';
import { Pricing } from '@/widgets/pricing';
import { LeadForm } from '@/features/lead-form';
import { LEAD_ANCHOR, POLICY_HREF } from '@/shared/config/nav';

/**
 * Главная. Собирается из блоков; данные читает страница и передаёт пропсами —
 * виджеты в базу не ходят (docs/ORCHESTRATION.md).
 *
 * Порядок секций — из прототипа: сначала подбор и доверие, затем товар,
 * затем цена и процесс, и только потом форма. Человек должен понимать,
 * за что платит, прежде чем его просят оставить телефон.
 */
export const revalidate = 3600;

export default async function HomePage() {
  const [rawProducts, { prices, extras }, settings] = await Promise.all([
    listVisible(),
    getPrices(),
    getAll(),
  ]);

  // репозитории отдают DTO контракта (даты строками), виджеты ждут доменный тип
  const products = rawProducts.map((dto) => productSchema.parse(dto));
  const priceRows = prices.map((row) => priceRowSchema.parse(row));

  const warranty = settingSchemas.warranty.safeParse(settings.warranty);
  const contacts = settingSchemas.contacts.safeParse(settings.contacts);
  const phone = contacts.success ? (contacts.data.phones[0] ?? '') : '';

  return (
    <>
      <Hero products={products} leadHref={LEAD_ANCHOR} catalogHref="#catalog" />
      <TrustStrip />
      <Services />
      <Catalog products={products} orderHref={LEAD_ANCHOR} />
      <SavingsBlock />
      <StepsTimeline {...(warranty.success ? { warranty: warranty.data } : {})} />
      <Pricing prices={priceRows} rates={extras} leadHref={LEAD_ANCHOR} />
      <WhyUs {...(warranty.success ? { warranty: warranty.data } : {})} />
      <section id="zayavka">
        <LeadForm
          phone={phone}
          policyHref={POLICY_HREF}
          title="Оставьте заявку — поможем с выбором"
        />
      </section>
    </>
  );
}
