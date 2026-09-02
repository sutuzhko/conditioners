import Link from 'next/link';

import { specsDictionaryContent as texts } from '@/features/specs-dictionary';
import { FieldsSkeleton } from '@/widgets/admin-shell';

import styles from '../page.module.css';

/** Справочник характеристик: шапка настоящая, поля групп — заготовками (issue #334). */
export default function SpecsDictionaryLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href={{ pathname: '/admin/catalog' }}>
            ← Каталог
          </Link>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
          <p className={styles.lead}>{texts.note}</p>
        </div>
      </header>

      <FieldsSkeleton fields={6} />
    </div>
  );
}
