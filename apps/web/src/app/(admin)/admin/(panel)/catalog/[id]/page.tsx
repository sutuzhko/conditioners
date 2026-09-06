import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CATALOG_PATH, productFormContent as texts } from '@/features/product-form';
import { getAdminSession, isOwner } from '@/server/auth';
import { requireOwnerPage } from '@/server/guards';
import { findById, type ProductDto } from '@/server/repo/products';
import { DataBlock, FieldsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

import { ProductEditor } from '../ProductEditor';
import { productFormData } from '../data';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  /* 🔴 Для чужого база не читается вовсе — и рубеж здесь не бросает отказ, а
     возвращает общий заголовок. `forbidden()` в метаданных не спасает: Next
     успевает вычислить их до того, как отказ доходит до ответа, и название
     уезжает в тело 403 (issue #524). Не прочитанное не утечёт ни при каком
     порядке потока. */
  const session = await getAdminSession();
  if (session === null || !isOwner(session)) return { title: texts.editTitle };

  const { id } = await params;
  const product = await findById(id);

  return { title: product?.name ?? texts.editTitle };
}

/**
 * Правка модели каталога.
 *
 * 🔴 Существование модели решается **до** первого куска потока (issue #651).
 * Пока заготовка стояла на границе раздела, она уходила в ответ первой, и
 * `notFound()` заставал статус уже отправленным: удалённая модель отвечала
 * 200. Здесь до первого байта успевает пройти только чтение самой модели —
 * один поиск по ключу, — и адрес удалённой записи отвечает честным 404.
 *
 * Справочник характеристик приезжает следом, отдельным куском потока: он к
 * существованию модели отношения не имеет, а заголовок с названием виден,
 * пока форма ещё собирается.
 */
export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

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
            {texts.back}
          </Link>
          <h1 className={styles.title}>{product.name}</h1>
        </div>
      </header>

      <DataBlock
        skeleton={<FieldsSkeleton fields={8} />}
        title={texts.loadFailed}
        note={blockErrorNote(CATALOG_PATH)}
        surface="bare"
      >
        <ProductForm product={product} />
      </DataBlock>
    </div>
  );
}

/**
 * Форма модели — то, что приезжает отдельным куском потока.
 *
 * Справочник характеристик читается здесь: он подсказывает названия в
 * редакторе и на существование модели не влияет.
 */
async function ProductForm({ product }: { readonly product: ProductDto }) {
  const { specDictionary } = await productFormData();

  return (
    <ProductEditor
      specDictionary={specDictionary}
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
        featured: product.featured,
        seoTitle: product.seoTitle ?? '',
        seoDescription: product.seoDescription ?? '',
        specs: product.specs.map((spec) => ({ k: spec.k, v: spec.v })),
      }}
    />
  );
}
