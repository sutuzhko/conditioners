'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useId, useRef } from 'react';
import { IconButton } from '../IconButton/IconButton';
import { Portal } from '../lib/Portal';
import { useDialog } from '../lib/useDialog';
import styles from './Modal.module.css';
import { Icon } from '../Icon';

export type ModalSize = 'sm' | 'md' | 'lg';

/**
 * Уровень заголовка окна — пропом, как у `Accordion` и `FormSection`
 * (ADR-159). Жёсткий `h2` перескакивал уровень там, где окно открывается
 * из раздела с собственным `h2`, а заголовки без пропусков уровней — это
 * инвариант 4, а не пожелание.
 */
const HEADINGS = { 2: 'h2', 3: 'h3' } as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string | undefined;
  footer?: ReactNode | undefined;
  size?: ModalSize | undefined;
  closeLabel?: string | undefined;
  className?: string | undefined;
  headingLevel?: 2 | 3 | undefined;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  description,
  footer,
  size = 'md',
  closeLabel = 'Закрыть',
  className,
  headingLevel = 2,
}: ModalProps) {
  const Heading = HEADINGS[headingLevel];
  const windowRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { onKeyDown } = useDialog({ open, onClose, containerRef: windowRef });

  if (!open) return null;

  // клик мимо окна закрывает; клик внутри — нет
  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <Portal>
      <div className={styles.overlay} onClick={handleOverlayClick}>
        <div
          ref={windowRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description === undefined ? undefined : descriptionId}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={[styles.window, styles[size], className].filter(Boolean).join(' ')}
        >
          <div className={styles.head}>
            <div>
              <Heading id={titleId} className={styles.title}>
                {title}
              </Heading>
              {description === undefined ? null : (
                <p id={descriptionId} className={styles.description}>
                  {description}
                </p>
              )}
            </div>
            <IconButton
              label={closeLabel}
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={<Icon name="close" size={18} />}
            />
          </div>
          <div className={styles.body}>{children}</div>
          {footer === undefined ? null : <div className={styles.footer}>{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
