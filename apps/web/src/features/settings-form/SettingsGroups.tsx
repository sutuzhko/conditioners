'use client';

import { useRef, useState, type FocusEvent, type FormEvent } from 'react';

import type { SettingKey } from '@/entities/settings/model';
import { Alert, Badge, Button, Card, CardBody, CardHeader, useConfirm } from '@/shared/ui';

import { GroupFields } from './GroupFields';
import { settingsFormContent as texts } from './content';
import {
  confirmGroupSwitch,
  putGroup,
  withGroupDefaults,
  withoutHiddenFields,
  writePath,
} from './lib';
import type { FieldDescriptor, GroupEntry, GroupValue, SaveGroup, SaveStatus } from './model';
import styles from './SettingsGroups.module.css';

export interface SettingsGroupsProps {
  readonly entries: readonly GroupEntry[];
  /** Отправка группы. Подменяется в историях и тестах; по умолчанию — PUT. */
  readonly save?: SaveGroup | undefined;
  /** Страница перечитывает данные: готовность считает сервер, а не форма. */
  readonly onSaved?: (() => void) | undefined;
}

type Drafts = Record<string, GroupValue>;

/** Группа, которую сервер не принял: о ней говорит сводка над формой. */
type Failure = { readonly key: SettingKey; readonly title: string };

function initialDrafts(entries: readonly GroupEntry[]): Drafts {
  const drafts: Drafts = {};
  for (const entry of entries) {
    /* Переключатель состава проставляется сразу: группа, сохранённая до его
       появления, лежит в базе без него, и без этого форма открылась бы
       пустой на непустых данных (см. `withGroupDefaults`). */
    drafts[entry.group.key] = withGroupDefaults(entry.group, entry.value);
  }
  return drafts;
}

/** Сравнение по JSON: значения — простые деревья из строк, чисел и флажков. */
function differs(left: GroupValue | undefined, right: GroupValue | undefined): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}

/**
 * Данные компании: тринадцать групп и одна кнопка «Сохранить» (issue #617).
 *
 * 🔴 Кнопка одна, а запросов по-прежнему столько, сколько тронутых групп:
 * контракт — `PUT` на группу (docs/API.md §5), и общего маршрута «сохранить
 * всё» у настроек нет. Одна кнопка — это про руки владельца, а не про сеть:
 * тринадцать кнопок на экране означали, что человек, поправивший телефон и
 * адрес, уезжал с сохранённым телефоном и потерянным адресом.
 *
 * 🔴 Отказ одной группы не отменяет остальные. Группы независимы — это
 * отдельные строки таблицы, и откатывать сохранённый телефон из-за описки в
 * ИНН значит терять сделанную работу. Что не сохранилось, называет сводка
 * над формой, и каждая строка сводки ведёт к своей группе.
 */
export function SettingsGroups({ entries, save = putGroup, onSaved }: SettingsGroupsProps) {
  const [drafts, setDrafts] = useState<Drafts>(() => initialDrafts(entries));
  /* 🔴 Точка отсчёта своя, а не проп: сервер приводит значения к единому виду
     (телефон — в первую очередь), и после перечитывания страницы значение из
     базы отличается от набранного. Сравнение с пропом объявляло бы только что
     сохранённую группу изменённой. */
  const [saved, setSaved] = useState<Drafts>(() => initialDrafts(entries));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedTitles, setSavedTitles] = useState<readonly string[]>([]);
  const [failures, setFailures] = useState<readonly Failure[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, Record<string, string>>>({});

  const summaryRef = useRef<HTMLDivElement>(null);
  /* Подтверждение необратимой правки — общий диалог кита, а не окно
     браузера: системное окно нельзя объяснить (ADR-113). */
  const { confirm, dialog } = useConfirm();

  const sending = status === 'sending';
  const changed = entries.filter((entry) =>
    differs(drafts[entry.group.key], saved[entry.group.key]),
  );
  const dirty = changed.length > 0;

  const ready = entries.filter((entry) => entry.ready).length;
  /* Пустой список групп процента не имеет: делить на ноль нечем, а «100 %»
     на пустой форме — выдуманный факт. */
  const percent = entries.length === 0 ? 0 : Math.round((ready / entries.length) * 100);

  const set = (key: SettingKey, path: string, next: unknown): void => {
    setDrafts((prev) => ({ ...prev, [key]: writePath(prev[key] ?? {}, path, next) }));
    setStatus('idle');
    setFieldErrors((prev) => {
      const own = prev[key];
      if (own === undefined || own[path] === undefined) return prev;
      return { ...prev, [key]: { ...own, [path]: '' } };
    });
  };

  const switchGroup = async (entry: GroupEntry, field: FieldDescriptor, next: unknown) => {
    const key = entry.group.key;
    const draft = drafts[key] ?? {};

    /* Отказ не меняет ничего: черновик не тронут, и переключатель
       возвращается на прежнее значение сам — он управляемый. */
    if (!(await confirmGroupSwitch(confirm, entry.group, draft, field))) return;

    setDrafts((prev) => ({ ...prev, [key]: writePath({}, field.path, next) }));
    setStatus('idle');
    setMessages((prev) => ({ ...prev, [key]: '' }));
    setFieldErrors((prev) => ({ ...prev, [key]: {} }));
  };

  const discard = (): void => {
    setDrafts({ ...saved });
    setStatus('idle');
    setSavedTitles([]);
    setFailures([]);
    setMessages({});
    setFieldErrors({});
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (sending || !dirty) return;

    setStatus('sending');
    setSavedTitles([]);
    setFailures([]);
    setMessages({});
    setFieldErrors({});

    const done: string[] = [];
    const failed: Failure[] = [];
    const nextSaved: Drafts = { ...saved };
    const nextMessages: Record<string, string> = {};
    const nextFieldErrors: Record<string, Record<string, string>> = {};

    /* Группы уходят по очереди, а не разом: тринадцать одновременных запросов
       к одной таблице настроек ускорили бы разве что отказ базы, а порядок
       на экране остался бы порядком в сводке. */
    for (const entry of changed) {
      const key = entry.group.key;
      const draft = drafts[key] ?? {};
      const result = await save(key, withoutHiddenFields(entry.group, draft));

      if (result.ok) {
        done.push(entry.group.title);
        nextSaved[key] = draft;
        continue;
      }

      failed.push({ key, title: entry.group.title });
      nextMessages[key] = result.message;
      nextFieldErrors[key] = result.fieldErrors ?? {};
    }

    setSaved(nextSaved);
    setSavedTitles(done);
    setFailures(failed);
    setMessages(nextMessages);
    setFieldErrors(nextFieldErrors);
    setStatus(failed.length === 0 ? 'success' : 'error');

    /* Готовность пересчитывает сервер: сохранившееся уже на сайте, и
       плашки групп обязаны показать новое состояние, а не прежнее. */
    if (done.length > 0) onSaved?.();

    if (failed.length > 0) summaryRef.current?.focus();
  };

  /**
   * Оглавление на телефоне — лента в одну строку с горизонтальной прокруткой
   * (issue #337). Chrome докручивает её к пункту, получившему фокус с
   * клавиатуры, только когда пункт скрыт целиком: наполовину срезанный он
   * считает видимым. Замер на 390: «Координаты на карте» получали фокус на
   * 373–527px при окне в 390 — видны 17px и обрезанное кольцо. На широком
   * экране лента не прокручивается, и вызов ничего не двигает.
   */
  const reveal = (event: FocusEvent<HTMLElement>): void => {
    event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {/* Полоса готовности и кнопка липнут к шапке: тринадцать групп — это
          девять экранов прокрутки, и кнопка, оставшаяся наверху, заставляла бы
          возвращаться к ней после каждой правки. */}
      <div className={styles.bar}>
        <div className={styles.barRow}>
          <div
            className={styles.track}
            role="progressbar"
            aria-label={texts.readinessLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={texts.readinessCount(ready, entries.length)}
          >
            <span className={styles.fill} style={{ inlineSize: `${percent}%` }} />
          </div>

          <span className={styles.percent}>{texts.readinessValue(percent)}</span>

          <div className={styles.actions}>
            {dirty ? (
              <Button type="button" variant="light" size="sm" disabled={sending} onClick={discard}>
                {texts.discardAll}
              </Button>
            ) : null}

            <Button
              type="submit"
              loading={sending}
              disabled={!dirty}
              disabledReason={dirty ? undefined : texts.nothingToSave}
            >
              {sending ? texts.savingAll : texts.saveAll}
            </Button>
          </div>
        </div>

        <nav className={styles.toc} aria-label={texts.tocLabel} onFocus={reveal}>
          {entries.map((entry) => (
            <a className={styles.tocLink} key={entry.group.key} href={`#${entry.group.key}`}>
              {entry.group.title}
            </a>
          ))}
        </nav>
      </div>

      {/* Сводка отказа ведёт к своей группе: кнопка одна, а групп тринадцать,
          и «сервер не принял изменения» без адреса — это предложение
          пролистать всю страницу. Фокус уходит сюда после неудачи. */}
      <div className={styles.summary} ref={summaryRef} tabIndex={-1}>
        {status === 'error' && failures.length > 0 ? (
          <Alert tone="danger" title={texts.saveFailedTitle}>
            <p className={styles.summaryText}>{texts.saveFailedText}</p>
            <ul className={styles.summaryList}>
              {failures.map((failure) => (
                <li key={failure.key}>
                  <a href={`#${failure.key}`}>{failure.title}</a>
                </li>
              ))}
            </ul>
            {savedTitles.length === 0 ? null : (
              <p className={styles.summaryText}>{texts.savedGroups(savedTitles)}</p>
            )}
          </Alert>
        ) : null}

        {/* Успех озвучивается вежливо: сохранение — не ошибка, перебивать
            чтение формы им не нужно. */}
        {status === 'success' ? (
          <p className={styles.saved} role="status">
            {texts.savedGroups(savedTitles)}
          </p>
        ) : null}
      </div>

      <div className={styles.groups}>
        {entries.map((entry) => {
          const key = entry.group.key;
          const draft = drafts[key] ?? {};
          const message = messages[key] ?? '';
          const errors = fieldErrors[key] ?? {};
          const groupDirty = differs(draft, saved[key]);

          return (
            <Card
              as="section"
              padding="none"
              /* 🔴 Краска у незаполненной группы — предупреждение, а не акцент:
                 акцентная карточка кита означает «в работе» (ADR-194, ADR-081),
                 и цвет «идёт сейчас» на группе, которую ещё не открывали, читался
                 бы неверно. Рамка красится своим классом на токенах предупреждения,
                 варианта `warning` у карточки в ките нет и заводить его ради
                 одного экрана незачем. */
              className={[styles.group, entry.ready ? null : styles.groupUnfilled]
                .filter(Boolean)
                .join(' ')}
              id={key}
              key={key}
              /* Секция названа заголовком группы: без имени читалка не
                 объявляет, в какую из тринадцати попал курсор. */
              aria-label={entry.group.title}
            >
              <CardHeader
                title={entry.group.title}
                subtitle={entry.group.description}
                as="h2"
                action={
                  <span className={styles.badges}>
                    {groupDirty ? <Badge variant="accent">{texts.groupDirty}</Badge> : null}
                    <Badge variant={entry.ready ? 'success' : 'warning'}>
                      {entry.ready ? texts.groupReady : texts.groupUnfilled}
                    </Badge>
                  </span>
                }
              />

              <CardBody>
                {entry.ready ? null : (
                  <p className={styles.missing}>{texts.groupMissing(entry.missing)}</p>
                )}

                <GroupFields
                  group={entry.group}
                  draft={draft}
                  fieldErrors={errors}
                  disabled={sending}
                  onChange={(path, next) => {
                    set(key, path, next);
                  }}
                  onSwitch={(field, next) => {
                    void switchGroup(entry, field, next);
                  }}
                />

                {/* Сообщение у группы — только когда его негде показать у
                    поля: сервер не назвал поле или отказ вообще не про
                    значения. Иначе один и тот же текст читался бы дважды. */}
                {message !== '' && Object.keys(errors).length === 0 ? (
                  <p className={styles.error}>{message}</p>
                ) : null}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Окно живёт вне карточек: подтверждение не принадлежит группе. */}
      {dialog}
    </form>
  );
}
