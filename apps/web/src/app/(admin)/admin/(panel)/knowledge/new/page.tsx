import type { Metadata } from 'next';
import Link from 'next/link';

import { KNOWLEDGE_PATH, articleFormContent as texts } from '@/features/article-form';
import { requireOwnerPage } from '@/server/guards';

import { ArticleEditor } from '../ArticleEditor';
import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.createTitle };

export const dynamic = 'force-dynamic';

/**
 * Новая статья базы знаний — страницей.
 *
 * 🔴 Тот же адрес, что и у окна создания: переход из списка перехватывается и
 * рисует окно, а прямой заход — ссылка из мессенджера, обновление страницы,
 * открытие в новой вкладке — обязан отдавать полноценную страницу (ADR-117).
 * Форма при этом одна и та же, разная только рамка вокруг неё.
 */
export default async function AdminNewArticlePage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href={{ pathname: KNOWLEDGE_PATH }}>
            ← {texts.listTitle}
          </Link>
          <h1 className={styles.title}>{texts.createTitle}</h1>
          <p className={styles.lead}>{texts.createHint}</p>
        </div>
      </header>

      <ArticleEditor />
    </div>
  );
}
