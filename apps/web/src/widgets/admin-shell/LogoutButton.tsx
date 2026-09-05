'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon } from '@/shared/ui';

import { adminShellContent as texts } from './content';

/**
 * Выход из панели.
 *
 * Кнопка, а не ссылка: выход меняет состояние на сервере, и ссылку на него
 * не должен уметь дёрнуть чужой сайт картинкой или предзагрузкой.
 */
export function LogoutButton({
  className,
  labelClassName,
  iconClassName,
}: {
  className?: string | undefined;
  /** Класс подписи: в рельсе она уходит из виду, оставаясь для читалки. */
  labelClassName?: string | undefined;
  /** Класс значка: ряд задаёт значкам свою краску. */
  iconClassName?: string | undefined;
}) {
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
    /* 🔴 Не кнопка кита, а обычная `<button>` с классом вызывающего.
       Кит приносил свою краску (`light` красит подпись акцентом), свою
       прозрачную рамку и свою обёртку подписи без зазора — и «Выйти» выпадал
       из ряда соседних ссылок тремя признаками сразу. Каждый чинился отдельным
       правилом поверх кита; вместо этого пункт берёт класс ряда целиком.
       Решение владельца от 4 сентября: чинить устройство, а не стили. */
    <button
      type="button"
      className={className}
      aria-busy={leaving}
      disabled={leaving}
      onClick={() => void logout()}
    >
      {/* Без подписи значок считается украшением и скрывается от чтения сам. */}
      <Icon className={iconClassName} name="exit" />
      <span className={labelClassName}>{texts.logout}</span>
    </button>
  );
}
