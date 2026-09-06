import Link from 'next/link';

import { KNOWLEDGE_NEW_PATH } from '@/features/article-form';
import { Skeleton, buttonClassName } from '@/shared/ui';
import { LineSkeleton } from '@/widgets/admin-shell';
import { ArticleSearch, adminKnowledgeContent as texts } from '@/widgets/admin-knowledge';

import styles from './page.module.css';

/**
 * База знаний: шапка и отбор настоящие, таблица статей — заготовкой
 * (issue #334).
 *
 * 🔴 Форма отбора рисуется как есть, а не серой полосой: она от данных не
 * зависит, а на узком экране переносится в два ряда — никакая полоса этого не
 * повторит (ADR-239). Рубрики заготовке неизвестны, и список рубрик поэтому
 * стоит с единственным пунктом: само поле остаётся на месте.
 *
 * 🔴 Строка счётчиков зависит от данных, поэтому вместо неё стоит заготовка
 * в строчном боксе того же кегля: полоса другой высоты сдвинула бы отбор и
 * таблицу ещё до прихода данных.
 */
export default function KnowledgeLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
          <p className={styles.summary}>
            <LineSkeleton width="min(280px, 70%)" />
          </p>
        </div>

        <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: KNOWLEDGE_NEW_PATH }}>
          {texts.add}
        </Link>
      </header>

      <ArticleSearch
        filter={{ query: '', category: '', state: undefined, order: undefined }}
        categories={[]}
      />

      <Skeleton variant="block" className={styles.tableSkeleton} />
    </div>
  );
}
