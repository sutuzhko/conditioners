'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Alert, Button, Card, FormSection, Switch, useConfirm, useLeaveGuard } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import {
  ADMIN_PERMISSION_HINTS,
  ADMIN_PERMISSION_TITLES,
  DANGEROUS_PERMISSIONS,
  PANEL_SECTION_PERMISSIONS,
  samePermissions,
  sortPermissions,
  staffTitle,
  type AdminPermission,
  type StaffApi,
  type StaffDetails,
  type StaffStatus,
} from './model';
import styles from './StaffPermissions.module.css';

export interface StaffPermissionsProps {
  readonly staff: StaffDetails;
  readonly api?: StaffApi | undefined;
  /** Шов для тестов и историй: вопрос при уходе с несохранёнными правками. */
  readonly confirmLeave?: Confirm | undefined;
}

const TOTAL = PANEL_SECTION_PERMISSIONS.length + DANGEROUS_PERMISSIONS.length;

/**
 * Права администратора: тринадцать разделов и пять опасных действий (ADR-344,
 * issue #786, #788).
 *
 * 🔴 Экран есть только у администратора, и рисует его карточка человека, а не
 * этот компонент. Владельцу настраивать нечего — он права раздаёт; у менеджера
 * и монтажника доступ задан ролью целиком, и переключатели у них означали бы
 * настройку, которая ни на что не влияет.
 *
 * 🔴 Скрытый экран защитой не является (CRM §6): раздачу прав закрывает
 * владельческий адрес `PATCH /api/admin/staff/{id}/access` — центральная карта
 * разрешений не открывает его никаким переключателем. Здесь — удобство, а не
 * рубеж.
 *
 * 🔴 Сохранение — кнопкой, а не по каждому щелчку. Переключатель, уходящий на
 * сервер сразу, отнимает у владельца возможность передумать: снял «Заявки» и
 * «Клиентов», понял, что перепутал человека, — и вернуть нечем, потому что
 * прежнего набора уже нигде нет. Заодно тринадцать щелчков стоили бы
 * тринадцати запросов и тринадцати поводов для отказа посередине.
 */
export function StaffPermissions({ staff, api = staffApi, confirmLeave }: StaffPermissionsProps) {
  /* Вопрос при уходе — общий диалог кита (ADR-113); проп остаётся швом для
     историй и тестов, чтобы не открывать окно ради проверки состояния. */
  const { confirm, dialog } = useConfirm();

  const router = useRouter();
  const [saved, setSaved] = useState<readonly AdminPermission[]>(staff.permissions);
  const [draft, setDraft] = useState<readonly AdminPermission[]>(staff.permissions);
  const [status, setStatus] = useState<StaffStatus>('idle');
  const [message, setMessage] = useState('');

  const sending = status === 'sending';
  const dirty = !samePermissions(draft, saved);

  /**
   * 🔴 Уход с несохранёнными правками спрашивает (issue #32, #788). Прежнего
   * набора форма нигде не держит: ушёл — вернулось серверное, и восемнадцать
   * переключателей расставляются заново.
   *
   * Пока идёт отправка, уходить некуда — кнопки заблокированы; после успеха
   * точка отсчёта сдвигается, и вопрос гаснет сам.
   */
  useLeaveGuard({
    when: dirty && !sending,
    confirm: confirmLeave ?? confirm,
    request: texts.accessLeave,
  });

  const toggle = (permission: AdminPermission, on: boolean): void => {
    setDraft((prev) =>
      sortPermissions(on ? [...prev, permission] : prev.filter((kept) => kept !== permission)),
    );
    /* Тронули переключатель — прошлый ответ сервера перестаёт относиться к делу. */
    setStatus('idle');
    setMessage('');
  };

  const discard = (): void => {
    setDraft(saved);
    setStatus('idle');
    setMessage('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending || !dirty) return;

    setStatus('sending');
    setMessage('');

    const result = await api.setAccess(staff.id, { permissions: draft });

    if (!result.ok) {
      setStatus('error');
      setMessage(result.message);
      return;
    }

    /* 🔴 Точка отсчёта сдвигается только после ответа сервера. Сдвинутая
       заранее превратила бы отказ в «сохранено»: переключатели стояли бы
       по-новому, а на сервере лежало бы старое. */
    setSaved(draft);
    setStatus('success');
    setMessage(texts.accessSaved);
    router.refresh();
  };

  return (
    <Card as="section">
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.head}>
          <h2 className={styles.title}>{texts.accessTitle}</h2>
          <p className={styles.hint}>{texts.accessHint(staffTitle(staff))}</p>
          <p className={styles.count}>{texts.accessGranted(draft.length, TOTAL)}</p>
        </div>

        <FormSection
          title={texts.accessSections}
          headingLevel={3}
          surface="bare"
          hint={texts.accessSectionsHint}
          gap="sm"
        >
          <ul className={styles.list}>
            {PANEL_SECTION_PERMISSIONS.map((permission) => (
              <li key={permission}>
                <PermissionSwitch
                  permission={permission}
                  on={draft.includes(permission)}
                  disabled={sending}
                  onToggle={toggle}
                />
              </li>
            ))}
          </ul>
        </FormSection>

        <FormSection
          title={texts.accessDangerous}
          headingLevel={3}
          surface="bare"
          hint={texts.accessDangerousHint}
          gap="sm"
        >
          <ul className={styles.list}>
            {DANGEROUS_PERMISSIONS.map((permission) => (
              <li key={permission}>
                <PermissionSwitch
                  permission={permission}
                  on={draft.includes(permission)}
                  disabled={sending}
                  onToggle={toggle}
                />
              </li>
            ))}
          </ul>
        </FormSection>

        {message === '' ? null : (
          <Alert tone={status === 'error' ? 'danger' : 'success'} title={message} />
        )}

        <div className={styles.actions}>
          <Button
            type="submit"
            loading={sending}
            disabled={!dirty}
            disabledReason={texts.accessNothingToSave}
          >
            {texts.accessSave}
          </Button>
          <Button type="button" variant="light" onClick={discard} disabled={!dirty || sending}>
            {texts.accessDiscard}
          </Button>
        </div>
      </form>

      {dialog}
    </Card>
  );
}

function PermissionSwitch({
  permission,
  on,
  disabled,
  onToggle,
}: {
  readonly permission: AdminPermission;
  readonly on: boolean;
  readonly disabled: boolean;
  readonly onToggle: (permission: AdminPermission, on: boolean) => void;
}) {
  return (
    <Switch
      label={ADMIN_PERMISSION_TITLES[permission]}
      hint={ADMIN_PERMISSION_HINTS[permission]}
      labelFirst
      checked={on}
      disabled={disabled}
      onChange={(event) => onToggle(permission, event.target.checked)}
    />
  );
}
