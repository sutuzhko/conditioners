'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { Card } from '@/shared/ui';

import { blockErrorContent as texts, blockErrorNote, sectionOf } from './content';
import { BlockError } from './DataBlock';
import styles from './SectionError.module.css';

export interface SectionErrorProps {
  readonly error: Error & { digest?: string };
  /** Сброс границы сегмента — приходит от `error.tsx` Next. */
  readonly reset: () => void;
}

/**
 * Ошибка раздела панели — то, что рисует `error.tsx` группы `(panel)`
 * (issue #336).
 *
 * Граница стоит внутри оболочки: шапка, колонка разделов и нижние вкладки
 * живут в layout выше неё и остаются на экране. Заголовок раздела рисуется
 * здесь заново — по адресу, а не по данным, — чтобы человек видел, где он
 * находится, и на странице оставался ровно один `h1` (инвариант 4).
 */
export function SectionError({ error, reset }: SectionErrorProps) {
  const pathname = usePathname();
  const section = sectionOf(pathname);

  useEffect(() => {
    /* След в консоли браузера — единственное место, где ошибку видно с клиента. */
    console.error(error);
  }, [error]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{section?.title ?? texts.unknownSection}</h1>
      </header>

      <Card as="section">
        <BlockError
          title={section === undefined ? texts.unknownTitle : texts.sectionTitle(section.title)}
          note={blockErrorNote(pathname)}
          onReset={reset}
        />
      </Card>
    </div>
  );
}
