import type { Metadata } from 'next';
import Link from 'next/link';

import { KNOWLEDGE_NEW_PATH } from '@/features/article-form';
import { buttonClassName } from '@/shared/ui';
import { requireOwnerPage } from '@/server/guards';
import { listAll } from '@/server/repo/articles';
import { AdminArticleList, adminKnowledgeContent as texts } from '@/widgets/admin-knowledge';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/** База знаний: список статей и вход в правку. */
export default async function AdminKnowledgePage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const articles = await listAll();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
        </div>

        <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: KNOWLEDGE_NEW_PATH }}>
          {texts.add}
        </Link>
      </header>

      <AdminArticleList articles={articles} />
    </div>
  );
}
