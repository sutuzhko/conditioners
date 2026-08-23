'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useId, useRef } from 'react';
import { IconButton } from '../IconButton/IconButton';
import { Portal } from '../lib/Portal';
import { useDialog } from '../lib/useDialog';
import styles from './Drawer.module.css';
import { Icon } from '../Icon';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** заголовок панели; если его нет, имя берётся из label */
  title?: string | undefined;
  label?: string | undefined;
  side?: 'left' | 'right' | undefined;
  footer?: ReactNode | undefined;
  closeLabel?: string | undefined;
  className?: string | undefined;
}

/**
 * Выдвижное меню мобильной шапки. Технически это тот же модальный слой,
 * что и Modal: ловушка фокуса, Escape, блокировка прокрутки — из useDialog.
 */
export function Drawer({
  open,
  onClose,
  children,
  title,
  label,
  side = 'right',
  footer,
  closeLabel = 'Закрыть меню',
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { onKeyDown } = useDialog({ open, onClose, containerRef: panelRef });

  if (!open) return null;

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <Portal>
      <div
        className={[styles.overlay, styles[side]].filter(Boolean).join(' ')}
        onClick={handleOverlayClick}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title === undefined ? undefined : titleId}
          aria-label={title === undefined ? label : undefined}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={[styles.panel, className].filter(Boolean).join(' ')}
        >
          <div className={styles.head}>
            {title === undefined ? (
              <span />
            ) : (
              <p id={titleId} className={styles.title}>
                {title}
              </p>
            )}
            <IconButton
              label={closeLabel}
              variant="ghost"
              size="md"
              onClick={onClose}
              icon={<Icon name="close" size={20} />}
            />
          </div>
          <div className={styles.body}>{children}</div>
          {footer === undefined ? null : <div className={styles.footer}>{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
