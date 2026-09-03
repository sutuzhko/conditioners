import Link from 'next/link';

import { KNOWLEDGE_NEW_PATH } from '@/features/article-form';
import { Skeleton, buttonClassName } from '@/shared/ui';
import { adminKnowledgeContent as texts } from '@/widgets/admin-knowledge';

import styles from './page.module.css';

/** База знаний: шапка с действием настоящая, таблица статей — заготовкой (issue #334). */
export default function KnowledgeLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
        </div>

        <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: KNOWLEDGE_NEW_PATH }}>
          {texts.add}
        </Link>
      </header>

      <Skeleton variant="block" className={styles.tableSkeleton} />
    </div>
  );
}
