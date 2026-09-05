'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';

import { Alert, Button, Select, useConfirm, type Confirm } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import { orderBulkApi } from './lib';
import {
  BULK_FIELD,
  BULK_FORM_ID,
  installerName,
  type OrderBulkApi,
  type OrderInstallerRef,
} from './model';
import styles from './OrderBulk.module.css';

export interface OrderBulkProps {
  /** Сколько нарядов в стопке всего — вторая половина подписи «Выбрано 1 из 24». */
  readonly total: number;
  /** Сколько строк на этой странице: по ним считается «выбрано всё». */
  readonly pageCount: number;
  /** Кому можно назначить. Пусто — группового действия нет вовсе. */
  readonly installers: readonly OrderInstallerRef[];
  /** Таблица целиком: она серверная и приходит сюда детьми. */
  readonly children: ReactNode;
  readonly api?: OrderBulkApi | undefined;
  /** Подтверждение выведено пропом: тесты и истории не открывают окно. */
  readonly confirm?: Confirm | undefined;
  /** Список перечитан после действия. Умолчание — обновление маршрута Next. */
  readonly onDone?: (() => void) | undefined;
}

/**
 * Выбор строк и групповое действие над выбранным (issue #596, макет «Заказы»).
 *
 * 🔴 Таблица остаётся серверной. Галочки — обычные `input` внутри этой формы,
 * и всё, что делает клиентский код, — считает отмеченное через `FormData` и
 * отправляет один запрос. Состояние на строку (восемь `useState` на страницу)
 * не заводится: выбор строки — это состояние формы, а не приложения, и браузер
 * умеет его сам.
 *
 * 🔴 Полоса действия появляется только когда что-то выбрано, но место под неё
 * не резервируется: она стоит над таблицей, и её появление двигает вниз
 * список, а не кнопку, по которой человек в этот момент целится.
 *
 * 🔴 Назначение спрашивает подтверждение (ADR-113): монтажник получит
 * уведомление по каждому наряду, и восемь писем, разосланных промахом мимо
 * галочки, отменить нечем.
 */
export function OrderBulk({
  total,
  pageCount,
  installers,
  children,
  api = orderBulkApi,
  confirm,
  onDone,
}: OrderBulkProps) {
  const router = useRouter();
  const { confirm: ask, dialog } = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  const [chosen, setChosen] = useState<readonly string[]>([]);
  const [installerId, setInstallerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const request = confirm ?? ask;
  const refresh = onDone ?? (() => router.refresh());

  /* Отмеченное считается из самой формы, а не хранится вторым списком: два
     источника правды о выборе расходятся ровно тогда, когда строка исчезает
     из списка после действия. */
  const recount = (form: HTMLFormElement): void => {
    const picked = new FormData(form)
      .getAll(BULK_FIELD)
      .filter((value): value is string => typeof value === 'string');

    setChosen(picked);
    setError('');
  };

  /* Галочки переключаются через DOM, а не через состояние на строку: сами
     `input` серверные, и второй список «что отмечено» жил бы рядом с формой,
     расходясь с ней при любом перечитывании страницы. */
  const setAll = (checked: boolean): void => {
    const form = formRef.current;
    if (form === null) return;

    for (const box of form.querySelectorAll<HTMLInputElement>(`input[name="${BULK_FIELD}"]`)) {
      box.checked = checked;
    }

    recount(form);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy || chosen.length === 0) return;

    const person = installers.find((item) => item.id === installerId) ?? null;
    if (person === null) {
      setError(texts.bulkAssignLabel);
      return;
    }

    const confirmed = await request({
      title: texts.bulkAskTitle(chosen.length, installerName(person)),
      description: texts.bulkAskText,
      confirmLabel: texts.bulkAskConfirm,
    });
    if (!confirmed) return;

    setBusy(true);
    const result = await api.assign(chosen, installerId);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setAll(false);
    refresh();
  };

  const empty = chosen.length === 0;

  return (
    <form
      className={styles.form}
      id={BULK_FORM_ID}
      ref={formRef}
      onChange={(event) => recount(event.currentTarget)}
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      {installers.length === 0 || empty ? null : (
        <div className={styles.bar}>
          <span className={styles.count}>{texts.selectedOf(chosen.length, total)}</span>

          <Select
            label={texts.bulkAssignLabel}
            options={installers.map((person) => ({
              value: person.id,
              label: installerName(person),
            }))}
            placeholder={texts.bulkPlaceholder}
            value={installerId}
            wrapperClassName={styles.pick}
            onChange={(event) => setInstallerId(event.target.value)}
          />

          <Button type="submit" size="sm" loading={busy} disabled={busy || installerId === ''}>
            {busy ? texts.bulkAssigning : texts.bulkAssign}
          </Button>

          <Button type="button" size="sm" variant="light" onClick={() => setAll(false)}>
            {texts.selectionClear}
          </Button>
        </div>
      )}

      {installers.length === 0 ? null : (
        <label className={styles.all}>
          <input
            type="checkbox"
            className={styles.allBox}
            checked={!empty && chosen.length === pageCount}
            onChange={(event) => setAll(event.target.checked)}
          />
          {texts.selectAll}
        </label>
      )}

      {error === '' ? null : (
        <Alert tone="danger" title={error} live="assertive" className={styles.error} />
      )}

      {children}
      {dialog}
    </form>
  );
}
