import type { Metadata } from 'next';
import Link from 'next/link';

import { articleFormContent as texts } from '@/features/article-form';

import { ArticleEditor } from '../ArticleEditor';
import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.createTitle };

/** Новая статья базы знаний. */
export default function AdminNewArticlePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href={{ pathname: '/admin/knowledge' }}>
            ← База знаний
          </Link>
          <h1 className={styles.title}>{texts.createTitle}</h1>
        </div>
      </header>

      <ArticleEditor />
    </div>
  );
}
