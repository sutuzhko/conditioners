import type { Metadata } from 'next';
import Link from 'next/link';

import { SpecsDictionaryForm, specsDictionaryContent as texts } from '@/features/specs-dictionary';
import { settingSchemas } from '@/entities/settings/model';
import { requireOwnerPage } from '@/server/guards';
import { getGroup } from '@/server/repo/settings';

import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Справочник характеристик (ADR-094).
 *
 * Лежит внутри каталога, а не в «Компании»: это про товар, а не про
 * организацию, и открывают его сразу после того, как заводят модель.
 */
export default async function AdminSpecsDictionaryPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const raw = await getGroup('specs');
  const parsed = settingSchemas.specs.safeParse(raw ?? {});
  const value = parsed.success ? parsed.data : settingSchemas.specs.parse({});

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {/* Заголовок и пояснения — одной колонкой: шапка раздела раскладывает
            детей в строку, чтобы справа помещались действия. */}
        <div>
          <Link className={styles.back} href={{ pathname: '/admin/catalog' }}>
            {texts.back}
          </Link>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
          <p className={styles.lead}>{texts.note}</p>
        </div>
      </header>

      <SpecsDictionaryForm value={value} />
    </div>
  );
}
