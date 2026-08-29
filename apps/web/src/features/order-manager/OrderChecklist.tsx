'use client';

import { useState, type FormEvent } from 'react';

import { Badge, Button, Card, Checkbox, IconButton, Icon, Input } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import {
  checklistProgress,
  checklistItemCreateSchema,
  type OrderChecklistCard,
  type OrderWorkApi,
} from './model';
import styles from './OrderChecklist.module.css';

export interface OrderChecklistProps {
  readonly api: OrderWorkApi;
  readonly items: readonly OrderChecklistCard[];
  readonly disabled?: boolean | undefined;
  /** Список приходит с сервера: после добавления и пересборки страница перечитывается. */
  readonly onChanged?: (() => void) | undefined;
}

/**
 * Чеклист выезда: что взять с собой.
 *
 * Отметка живёт локально до ответа сервера и откатывается при отказе:
 * галочка, которая ждёт полного перечитывания страницы, на телефоне у машины
 * ощущается сломанной. Всё остальное — добавление, удаление, пересборка —
 * меняет состав списка, и его приносит сервер.
 *
 * 🔴 Отмечает и дописывает обе роли: список сборов ведёт тот, кто собирается
 * (docs/CRM.md §6). Удалить можно только дописанный пункт — собранный из
 * наряда вернётся первой же пересборкой, и кнопка у него не появляется.
 */
export function OrderChecklist({ api, items, disabled = false, onChanged }: OrderChecklistProps) {
  /** Отметки, ещё не подтверждённые сервером: ключ — номер пункта. */
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  /**
   * 🔴 Пункты, по которым запрос ещё в пути. Ключ — номер пункта, а не общий
   * флаг: монтажник отмечает список подряд, и запрещать вторую галочку, пока
   * летит первая, значит мешать работе.
   *
   * Нужны они против гонки: два быстрых нажатия по одной галочке давали два
   * `PATCH`, и если первый отвечал отказом позже второго, откат записывал
   * значение от устаревшего ответа. Экран показывал не то, что в базе.
   */
  const [flying, setFlying] = useState<Record<string, boolean>>({});

  const shown = items.map((item) => ({ ...item, done: marks[item.id] ?? item.done }));
  const progress = checklistProgress(shown);
  const locked = disabled || busy || rebuilding;

  const toggle = async (item: OrderChecklistCard, done: boolean): Promise<void> => {
    // список занят целиком (пересборка, добавление) — или этот пункт уже в пути
    if (locked || flying[item.id] === true) return;

    setFlying((current) => ({ ...current, [item.id]: true }));
    setMarks((current) => ({ ...current, [item.id]: done }));
    setMessage('');

    const result = await api.setItemDone(item.id, done);
    // снимаем признак значением, а не удалением ключа: пунктов десяток, и
    // читать «false» проще, чем разбирать деструктуризацию с отбрасыванием
    setFlying((current) => ({ ...current, [item.id]: false }));

    if (result.ok) return;

    /* Сервер отказал — галочка возвращается: показывать собранным то, что
       сервер таким не считает, значит соврать монтажнику. */
    setMarks((current) => ({ ...current, [item.id]: !done }));
    setMessage(result.message);
  };

  /**
   * Список перестроился на сервере — местные отметки отпускаются.
   *
   * 🔴 Без этого они переживали и добавление пункта, и удаление: список
   * приходил с сервера свежим, а `marks` продолжали перекрывать его значения
   * — по номерам пунктов, которых в новом списке могло уже не быть.
   */
  const refreshed = (): void => {
    setMarks({});
    onChanged?.();
  };

  const add = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (locked) return;

    /* Клиентская проверка — той же доменной схемой, что и на сервере. */
    const parsed = checklistItemCreateSchema.safeParse({ text });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? texts.invalid);
      return;
    }

    setBusy(true);
    setFieldError('');
    setMessage('');

    const result = await api.addItem(parsed.data.text);
    setBusy(false);

    if (result.ok) {
      setText('');
      refreshed();
      return;
    }

    if (result.field === 'text') setFieldError(result.message);
    else setMessage(result.message);
  };

  const remove = async (item: OrderChecklistCard): Promise<void> => {
    if (locked) return;

    setBusy(true);
    setMessage('');

    const result = await api.removeItem(item.id);
    setBusy(false);

    if (result.ok) {
      refreshed();
      return;
    }
    setMessage(result.message);
  };

  const rebuild = async (): Promise<void> => {
    if (locked) return;

    setRebuilding(true);
    setMessage('');

    const result = await api.rebuildChecklist();
    setRebuilding(false);

    if (result.ok) {
      // отметки приедут с сервера — местную копию отпускаем
      refreshed();
      return;
    }
    setMessage(result.message);
  };

  return (
    <Card as="section" aria-labelledby="order-checklist-title">
      <div className={styles.head}>
        <h2 className={styles.title} id="order-checklist-title">
          {texts.checklistTitle}
        </h2>

        {shown.length === 0 ? null : (
          <p className={styles.progress}>
            {texts.checklistProgress(progress.done, progress.total)}
          </p>
        )}
      </div>

      <p className={styles.hint}>{texts.checklistHint}</p>

      {shown.length === 0 ? (
        <p className={styles.empty}>{texts.checklistEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((item) => (
            <li className={styles.item} key={item.id}>
              <Checkbox
                label={item.text}
                checked={item.done}
                disabled={disabled || rebuilding}
                wrapperClassName={styles.check}
                onChange={(event) => void toggle(item, event.target.checked)}
              />

              {item.own ? (
                <>
                  <Badge size="sm" variant="neutral">
                    {texts.checklistOwn}
                  </Badge>

                  {/* 🔴 Кнопка есть только у дописанного пункта: собранный из
                      наряда сервер удалить не даст, и молчаливый отказ на
                      нажатие был бы хуже отсутствующей кнопки. */}
                  <IconButton
                    label={texts.checklistRemove(item.text)}
                    variant="ghost"
                    size="sm"
                    disabled={locked}
                    icon={<Icon name="close" size={16} />}
                    onClick={() => void remove(item)}
                  />
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form className={styles.add} onSubmit={add} noValidate>
        <Input
          label={texts.checklistAddLabel}
          placeholder={texts.checklistAddPlaceholder}
          value={text}
          disabled={locked}
          error={fieldError === '' ? undefined : fieldError}
          autoComplete="off"
          wrapperClassName={styles.addField}
          onChange={(event) => {
            setText(event.target.value);
            setFieldError('');
          }}
        />

        <Button type="submit" size="sm" variant="secondary" disabled={locked} loading={busy}>
          {texts.checklistAdd}
        </Button>
      </form>

      <div className={styles.actions}>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={locked}
          loading={rebuilding}
          onClick={() => void rebuild()}
        >
          {rebuilding ? texts.checklistRebuilding : texts.checklistRebuild}
        </Button>

        <span className={styles.quiet}>{texts.checklistRebuildHint}</span>
      </div>

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
    </Card>
  );
}
