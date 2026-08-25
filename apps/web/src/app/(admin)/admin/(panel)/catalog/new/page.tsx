import type { Metadata } from 'next';
import Link from 'next/link';

import { productFormContent as texts } from '@/features/product-form';

import { ProductEditor } from '../ProductEditor';
import styles from '../page.module.css';
import { settingSchemas } from '@/entities/settings/model';
import { requireOwnerPage } from '@/server/guards';
import { getGroup } from '@/server/repo/settings';

export const metadata: Metadata = { title: texts.createTitle };

/** Новая модель каталога. */
export default async function AdminNewProductPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  /* Справочник подсказывает названия характеристик в редакторе (ADR-094).
     Битая запись не должна ронять страницу правки — разбираем со схемой. */
  const dictionary = settingSchemas.specs.safeParse((await getGroup('specs')) ?? {});
  const specDictionary = dictionary.success ? dictionary.data : settingSchemas.specs.parse({});

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href={{ pathname: '/admin/catalog' }}>
            ← Каталог
          </Link>
          <h1 className={styles.title}>{texts.createTitle}</h1>
        </div>
      </header>

      <ProductEditor specDictionary={specDictionary} />
    </div>
  );
}
