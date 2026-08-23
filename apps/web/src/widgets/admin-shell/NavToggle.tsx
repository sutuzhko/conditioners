'use client';

import { Icon, IconButton } from '@/shared/ui';

import { useNavState } from './NavState';
import { adminShellContent as texts } from './content';
import styles from './AdminShell.module.css';

/**
 * Переключатель боковой навигации.
 *
 * Стоит первым в шапке, у самого края: колонка, которой он управляет, начинается
 * ровно под ним — связь читается без подписи.
 */
export function NavToggle() {
  const { open, toggle } = useNavState();

  return (
    <IconButton
      className={styles.toggle}
      label={open ? texts.navHide : texts.navShow}
      icon={<Icon name="burger" />}
      aria-expanded={open}
      onClick={toggle}
    />
  );
}
