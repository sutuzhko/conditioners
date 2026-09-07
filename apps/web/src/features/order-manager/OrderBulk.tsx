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
 * Панель режима выбора и групповое действие над выбранным (issue #596, #738,
 * #739, макет «Заказы»).
 *
 * 🔴 Таблица остаётся серверной. Галочки — обычные `input` внутри этой формы,
 * и всё, что делает клиентский код, — считает отмеченное через `FormData` и
 * отправляет один запрос. Состояние на строку (восемь `useState` на страницу)
 * не заводится: выбор строки — это состояние формы, а не приложения, и браузер
 * умеет его сам.
 *
 * 🔴 Панель стоит над таблицей ВСЕГДА и в каждом состоянии состоит из одних и
 * тех же узлов — меняются только слова и отказы контролов (issue #738). Раньше
 * она появлялась по первой галочке и уезжала на 74px вниз вместе с таблицей и
 * той самой строкой, по которой в этот момент целились: на телефоне палец
 * оказывался уже над третьим нарядом, а отмечался второй. Резерв места здесь
 * не «подобранная высота», которая разойдётся с содержимым на первой правке
 * подписи, а тождество разметки: двигаться нечему, потому что ничего не
 * появляется и не исчезает.
 *
 * 🔴 Слева — сколько выбрано и выход из режима, справа — действие над
 * выбранным, и поле назначения приходит вместе со своей кнопкой одной группой
 * (issue #739). Счёт стоит отдельным `role="status"`, а не подписью поля:
 * подпись внутри контрола — приём формы, где поле одно из многих, а здесь оно
 * единственное и объяснять нечего.
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
      setError(texts.bulkOffInstaller);
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

  /* Почему кнопка не работает — по первой невыполненной причине, а не общим
     «недоступно»: пока ничего не отмечено, монтажник ни при чём. */
  const assignOff = empty ? texts.bulkOffEmpty : texts.bulkOffInstaller;

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
      {/* Назначать некому — выбирать незачем: без исполнителей у полосы нет ни
          одного действия, и она не рисуется вовсе. Таблица тогда приходит без
          колонки галочек (`OrderList`), так что «исчезающей» полосы не
          возникает: состав страницы задан данными, а не нажатием. */}
      {installers.length === 0 ? null : (
        <div className={styles.bar} data-active={empty ? 'false' : 'true'}>
          <div className={styles.mode}>
            {/* 🔴 Галочка выбора всей страницы — обычный `input` в своей
                подписи, а не флажок кита: у кита цель считается по рамке
                подписи, и она даёт 24px там, где до 900px нужно 44 (ADR-183).
                Заодно она выглядит ровно как галочки строк под ней — тот же
                нативный флажок с тем же акцентом, а не второй вид флажка на
                одном экране. */}
            <label className={styles.pickAll}>
              <input
                type="checkbox"
                className={styles.pickAllBox}
                checked={!empty && chosen.length === pageCount}
                onChange={(event) => setAll(event.target.checked)}
              />
              {texts.selectAll}
            </label>

            {/* 🔴 Счёт — живая область, а не просто текст: он меняется от
                нажатия в другом месте экрана, и без объявления читалка о нём
                не скажет. `aria-atomic` — чтобы прозвучало «Выбрано 3 из 24»
                целиком, а не одна изменившаяся цифра. */}
            <span className={styles.count} role="status" aria-atomic="true">
              {empty ? texts.selectedNone : texts.selectedOf(chosen.length, total)}
            </span>

            {/* Выход из режима стоит слева, рядом со счётом, и весом ниже
                назначения: снять выбор — это не действие над нарядами. */}
            <Button
              type="button"
              size="md"
              variant="light"
              disabled={empty}
              disabledReason={texts.selectionClearOff}
              onClick={() => setAll(false)}
            >
              {texts.selectionClear}
            </Button>
          </div>

          {/* Поле и его кнопка — одна группа: у неё общее имя, и второе
              групповое действие встанет сюда же следующей группой, а не
              четвёртым разнородным элементом общего ряда. */}
          <div className={styles.act} role="group" aria-label={texts.bulkGroup}>
            <Select
              aria-label={texts.bulkAssignLabel}
              options={installers.map((person) => ({
                value: person.id,
                label: installerName(person),
              }))}
              placeholder={texts.bulkPlaceholder}
              value={installerId}
              disabled={empty}
              className={styles.pickControl}
              wrapperClassName={styles.pick}
              onChange={(event) => setInstallerId(event.target.value)}
            />

            <Button
              type="submit"
              size="md"
              loading={busy}
              disabled={busy || empty || installerId === ''}
              disabledReason={assignOff}
            >
              {busy ? texts.bulkAssigning : texts.bulkAssign}
            </Button>
          </div>
        </div>
      )}

      {error === '' ? null : (
        <Alert tone="danger" title={error} live="assertive" className={styles.error} />
      )}

      {children}
      {dialog}
    </form>
  );
}
