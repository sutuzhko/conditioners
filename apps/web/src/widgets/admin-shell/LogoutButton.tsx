'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/shared/ui';

import { adminShellContent as texts } from './content';

/**
 * Выход из панели.
 *
 * Кнопка, а не ссылка: выход меняет состояние на сервере, и ссылку на него
 * не должен уметь дёрнуть чужой сайт картинкой или предзагрузкой.
 */
export function LogoutButton({ className }: { className?: string | undefined }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const logout = async (): Promise<void> => {
    setLeaving(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      /* Даже если запрос не дошёл, уводим на вход: остаться в панели без
         рабочей сессии хуже, чем лишний раз ввести пароль. Дальше middleware
         сам решит, куда пускать. */
      router.refresh();
      router.push('/admin/login');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      loading={leaving}
      onClick={logout}
    >
      {texts.logout}
    </Button>
  );
}
