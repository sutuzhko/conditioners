'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import styles from './Accordion.module.css';

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

export interface AccordionProps {
  items: readonly AccordionItem[];
  /** single — открыт максимум один раздел, multiple — сколько угодно */
  mode?: 'single' | 'multiple' | undefined;
  defaultOpen?: readonly string[] | undefined;
  /** уровень заголовка: FAQ на странице живёт под h2, значит вопросы — h3 */
  headingLevel?: 2 | 3 | 4 | undefined;
  className?: string | undefined;
}

const HEADINGS = { 2: 'h2', 3: 'h3', 4: 'h4' } as const;

export function Accordion({
  items,
  mode = 'single',
  defaultOpen = [],
  headingLevel = 3,
  className,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<readonly string[]>(defaultOpen);
  const baseId = useId();
  const Heading = HEADINGS[headingLevel];

  const toggle = (id: string) => {
    setOpenIds((current) => {
      if (current.includes(id)) return current.filter((openId) => openId !== id);
      return mode === 'single' ? [id] : [...current, id];
    });
  };

  return (
    <div className={[styles.list, className].filter(Boolean).join(' ')}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const panelId = `${baseId}-${item.id}-panel`;
        const triggerId = `${baseId}-${item.id}-trigger`;

        return (
          <div
            key={item.id}
            className={[styles.item, isOpen ? styles.open : null].filter(Boolean).join(' ')}
          >
            <Heading className={styles.heading}>
              <button
                type="button"
                id={triggerId}
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
              >
                <span>{item.title}</span>
                <span className={styles.icon} aria-hidden="true">
                  +
                </span>
              </button>
            </Heading>
            {/* панель не размонтируется: свёрнутый ответ обязан остаться
                в HTML — его читает робот и разметка FAQPage */}
            <div id={panelId} className={styles.panel} role="region" aria-labelledby={triggerId}>
              <div className={styles.panelInner} inert={!isOpen}>
                <div className={styles.content}>{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
