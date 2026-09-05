'use client';

import { useId, useState, type FormEvent } from 'react';

import { Button, Card, useConfirm } from '@/shared/ui';

import { GroupFields } from './GroupFields';
import { settingsFormContent as texts } from './content';
import {
  confirmGroupSwitch,
  putGroup,
  withGroupDefaults,
  withoutHiddenFields,
  writePath,
} from './lib';
import type { FieldDescriptor, GroupDescriptor, GroupValue, SaveGroup, SaveStatus } from './model';
import styles from './SettingsForm.module.css';

export interface SettingsFormProps {
  readonly group: GroupDescriptor;
  /** Текущее значение группы из базы. Пустой объект — группа ещё не сохранялась. */
  readonly value: GroupValue;
  /** Отправка. Подменяется в историях и тестах; по умолчанию — PUT /api/admin/settings/{key}. */
  readonly save?: SaveGroup | undefined;
}

/**
 * Форма одной группы настроек — со своей кнопкой.
 *
 * 🔴 Зовёт её ровно одна страница: «Уведомления», где группа стоит одна и
 * ждать соседей ей не от кого. Данные компании собраны в общую форму с одной
 * кнопкой (`SettingsGroups`, issue #617): тринадцать кнопок «Сохранить» на
 * одном экране означали, что владелец, правивший телефон и адрес, уезжал с
 * сохранённым телефоном и потерянным адресом.
 *
 * Проверка значений остаётся на сервере: схема Zod там одна и та же для формы
 * и для API, дублировать её здесь — значит однажды разойтись с ней.
 */
export function SettingsForm({ group, value, save = putGroup }: SettingsFormProps) {
  const titleId = useId();
  /* Переключатель состава проставляется сразу: группа, сохранённая до его
     появления, лежит в базе без него, и без этого форма открылась бы пустой
     на непустых данных (см. `withGroupDefaults`). */
  const [draft, setDraft] = useState<GroupValue>(() => withGroupDefaults(group, value));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /* Подтверждение необратимой правки — общий диалог кита, а не окно
     браузера: системное окно нельзя объяснить (ADR-113). */
  const { confirm, dialog } = useConfirm();

  const sending = status === 'sending';
  /* Сравнение по JSON, а не по ссылкам: значения — простые деревья из строк,
     чисел и флажков, и глубокого сравнения руками они не стоят.

     Сравнивается с тем же приведённым значением, что легло в черновик: иначе
     проставленный переключатель сам по себе выглядел бы правкой владельца, и
     форма предлагала бы сохранить то, чего он не трогал. */
  const dirty = JSON.stringify(draft) !== JSON.stringify(withGroupDefaults(group, value));

  const set = (path: string, next: unknown): void => {
    setDraft((prev) => writePath(prev, path, next));
    setStatus('idle');
    setFieldErrors((prev) => (prev[path] === undefined ? prev : { ...prev, [path]: '' }));
  };

  const switchGroup = async (field: FieldDescriptor, next: unknown): Promise<void> => {
    /* Отказ не меняет ничего: черновик не тронут, и переключатель
       возвращается на прежнее значение сам — он управляемый. */
    if (!(await confirmGroupSwitch(confirm, group, draft, field))) return;

    setDraft(writePath({}, field.path, next));
    setStatus('idle');
    setMessage('');
    setFieldErrors({});
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending) return;

    setStatus('sending');
    setMessage('');
    setFieldErrors({});

    const result = await save(group.key, withoutHiddenFields(group, draft));

    if (result.ok) {
      setStatus('success');
      return;
    }

    setStatus('error');
    setMessage(result.message);
    setFieldErrors(result.fieldErrors ?? {});
  };

  return (
    <Card as="section" className={styles.card} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        {group.title}
      </h2>
      <p className={styles.description}>{group.description}</p>

      <form className={styles.form} onSubmit={submit} noValidate>
        <GroupFields
          group={group}
          draft={draft}
          fieldErrors={fieldErrors}
          disabled={sending}
          onChange={set}
          onSwitch={(field, next) => {
            void switchGroup(field, next);
          }}
        />

        {/* Сообщение над кнопкой — только когда его негде показать у поля:
            сервер не назвал поле или отказ вообще не про значения (истёкшая
            сессия, недоступная сеть). Иначе один и тот же текст читался бы
            диктором дважды. */}
        {message !== '' && Object.keys(fieldErrors).length === 0 ? (
          <p className={styles.error} role="alert">
            {message}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button type="submit" loading={sending} disabled={!dirty && status !== 'error'}>
            {sending ? texts.saving : texts.save}
          </Button>

          {dirty ? (
            <Button
              type="button"
              variant="light"
              disabled={sending}
              onClick={() => {
                setDraft(withGroupDefaults(group, value));
                setStatus('idle');
                setMessage('');
                setFieldErrors({});
              }}
            >
              {texts.discard}
            </Button>
          ) : null}

          {/* Успех озвучивается вежливо: сохранение — не ошибка, перебивать
              чтение формы им не нужно. */}
          {status === 'success' ? (
            <p className={styles.saved} role="status">
              {texts.saved}. {group.savedNote ?? texts.savedNote}
            </p>
          ) : null}
        </div>
      </form>

      {/* Окно живёт вне формы: кнопки подтверждения не имеют отношения к
          отправке группы. */}
      {dialog}
    </Card>
  );
}
