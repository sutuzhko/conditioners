'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { phoneHref } from '@/shared/lib/format';
import { RowMenu, useConfirm, type Confirm } from '@/shared/ui';

import { leadManagerContent as texts } from './content';
import { removeLead } from './lib';
import { LEADS_PATH, type LeadRemove } from './model';
import styles from './LeadRowActions.module.css';

export interface LeadRowActionsProps {
  readonly id: string;
  readonly number: number;
  readonly phone: string;
  readonly remove?: LeadRemove | undefined;
  /** Шов для тестов и историй: окно кита подменяется своим ответом (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
  readonly onChanged?: (() => void) | undefined;
}

/**
 * Действия строки очереди (issue #601): позвонить и удалить.
 *
 * 🔴 Действия достижимы из списка, а не только из открытой карточки. Пока
 * удалить обращение можно было лишь открыв его, разбор очереди из десяти
 * строк стоил десяти переходов туда и обратно. «Открыть» отдельным пунктом
 * меню не заведено намеренно — имя в строке уже ссылка, и второй способ
 * сделать то же самое только удлиняет список.
 *
 * 🔴 Меню, а не три круглые кнопки со значками, как нарисовано в макете. У
 * кита нет значков «глаз», «карандаш» и «корзина», а кнопка без подписи и без
 * значка не читается вовсе; меню называет каждое действие словом и не требует
 * наведения, которого нет ни у пальца, ни у клавиатуры (ADR-307 §2, строка в
 * PIXEL_SPEC §«Отступления панели»).
 *
 * Клиентский лист: он существует ради подтверждения и запроса, сама очередь
 * остаётся серверной.
 */
export function LeadRowActions({
  id,
  number,
  phone,
  remove = removeLead,
  confirmRemove,
  onChanged,
}: LeadRowActionsProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  /**
   * 🔴 Удаление спрашивает подтверждение и называет, что именно исчезнет
   * (ADR-113). Отказ от подтверждения не делает ничего — ни запроса, ни
   * пометки: это единственное правильное поведение необратимого действия.
   */
  const handleRemove = async (): Promise<void> => {
    if (busy) return;
    if (
      !(await ask({
        title: texts.removeConfirmTitle(number),
        description: texts.removeConfirmText,
        confirmLabel: texts.removeConfirmAction,
        cancelLabel: texts.removeCancel,
      }))
    ) {
      return;
    }

    setBusy(true);
    setMessage('');

    const result = await remove(id);
    setBusy(false);

    if (result.ok) {
      onChanged?.();
      /* Удалённое обращение могло быть открытым: уходим к чистой очереди,
         иначе карточка справа осталась бы показывать несуществующее. */
      router.push(LEADS_PATH);
      router.refresh();
      return;
    }
    setMessage(result.message ?? texts.serverError);
  };

  return (
    <div className={styles.wrap}>
      <RowMenu
        label={texts.rowActions(number)}
        items={[
          {
            id: 'call',
            label: texts.rowCall,
            onSelect: () => {
              window.location.href = phoneHref(phone);
            },
          },
          {
            id: 'remove',
            label: texts.remove,
            danger: true,
            disabled: busy,
            onSelect: () => void handleRemove(),
          },
        ]}
      />

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </div>
  );
}
