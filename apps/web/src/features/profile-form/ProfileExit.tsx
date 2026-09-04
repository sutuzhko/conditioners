'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Icon } from '@/shared/ui';

import { profileFormContent as texts } from './content';
import styles from './ProfileForm.module.css';

export interface ProfileExitProps {
  /** Шов для историй и тестов: по умолчанию — настоящий выход. */
  readonly logout?: (() => Promise<void>) | undefined;
}

async function endSession(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

/**
 * Выход из панели со страницы профиля.
 *
 * Кнопка, а не ссылка: выход меняет состояние на сервере, и дёрнуть его
 * чужой сайт картинкой или предзагрузкой не должен.
 *
 * 🔴 Своя, а не общая с колонкой разделов: `LogoutButton` живёт в оболочке
 * панели и наружу не выведен. Здесь это не тот же элемент — в колонке он
 * пункт навигации без объяснений, а в профиле стоит с подписью о том, что
 * пароль восстанавливается только владельцем. Общей у них остаётся ручка
 * `/api/auth/logout`.
 */
export function ProfileExit({ logout = endSession }: ProfileExitProps) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const leave = async (): Promise<void> => {
    setLeaving(true);
    try {
      await logout();
    } finally {
      /* Даже если запрос не дошёл, уводим на вход: остаться в панели без
         рабочей сессии хуже, чем лишний раз ввести пароль. */
      router.refresh();
      router.push('/admin/login');
    }
  };

  return (
    <Button
      type="button"
      variant="bordered"
      className={styles.exit}
      loading={leaving}
      onClick={() => {
        void leave();
      }}
    >
      <Icon name="exit" />
      {texts.exit}
    </Button>
  );
}
