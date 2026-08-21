import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { productFormContent as texts } from '@/features/product-form';
import { findById } from '@/server/repo/products';

import { ProductEditor } from '../ProductEditor';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await findById(id);

  return { title: product?.name ?? texts.editTitle };
}

/** Правка модели каталога. */
export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await findById(id);

  /* Модель могли удалить из соседней вкладки — 404 честнее пустой формы,
     которая на сохранении ответит ошибкой. */
  if (product === null) notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href={{ pathname: '/admin/catalog' }}>
            ← Каталог
          </Link>
          <h1 className={styles.title}>{product.name}</h1>
        </div>
      </header>

      <ProductEditor
        id={product.id}
        priceNum={product.priceNum}
        photos={product.photos}
        sale={{
          salePrice: product.salePrice === null ? '' : String(product.salePrice),
          // Границы приходят днями по местному времени — так их и правит владелец.
          saleFrom: product.saleFrom ?? '',
          saleTo: product.saleTo ?? '',
          saleLabel: product.saleLabel ?? '',
        }}
        values={{
          name: product.name,
          badge: product.badge,
          areaMax: String(product.areaMax),
          priceNum: String(product.priceNum),
          tag: product.tag ?? '',
          brand: product.brand ?? '',
          sku: product.sku ?? '',
          link: product.link ?? '',
          slug: product.slug,
          sort: String(product.sort),
          visible: product.visible,
          seoTitle: product.seoTitle ?? '',
          seoDescription: product.seoDescription ?? '',
          specs: product.specs.map((spec) => ({ k: spec.k, v: spec.v })),
        }}
      />
    </div>
  );
}
