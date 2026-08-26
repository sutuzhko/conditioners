'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/shared/ui';

import { ClientForm } from './ClientForm';
import { clientManagerContent as texts } from './content';
import { clientApi } from './lib';
import type { ClientApi } from './model';
import styles from './ClientAdd.module.css';

export interface ClientAddProps {
  readonly api?: ClientApi | undefined;
}

/**
 * Заведение клиента руками.
 *
 * Форма свёрнута по умолчанию: чаще всего клиент приезжает сюда из обращения
 * кнопкой «В клиенты», а список открывают, чтобы найти человека и позвонить.
 */
export function ClientAdd({ api = clientApi }: ClientAddProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.add}>
      <div className={styles.top}>
        <Button
          type="button"
          variant={open ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setOpen((shown) => !shown)}
        >
          {open ? texts.addClose : texts.addOpen}
        </Button>
      </div>

      {open ? <ClientForm api={api} onSaved={() => router.refresh()} /> : null}
    </div>
  );
}
