'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Card, Textarea, useConfirm, type Confirm } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import type { InstallerNoteCard, StaffApi } from './model';
import styles from './InstallerNotes.module.css';

export interface InstallerNotesProps {
  readonly staffId: string;
  readonly notes: readonly InstallerNoteCard[];
  readonly api?: StaffApi | undefined;
  /** Шов для тестов и историй: окно кита подменяется своим ответом (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/**
 * Заметки владельца о монтажнике.
 *
 * Монтажник их не видит — они и не приходят на его страницы: раздел целиком
 * закрыт `withOwner`, а не спрятан условием в разметке.
 *
 * 🔴 Удаление спрашивает подтверждение окном кита (ADR-113, issue #603). До
 * этой правки крестик стирал заметку сразу: восстановить её нечем, а стоит она
 * ровно того наблюдения о человеке, ради которого её и записали.
 */
export function InstallerNotes({
  staffId,
  notes,
  api = staffApi,
  confirmRemove,
}: InstallerNotesProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>): Promise<void> => {
    setBusy(true);
    setMessage('');

    const result = await action();

    setBusy(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setMessage(result.message ?? texts.serverError);
  };

  /**
   * 🔴 Отказ от подтверждения не делает ничего — ни запроса, ни пометки.
   * Заметка называется в вопросе целиком: «удалить заметку» без текста
   * выглядит одинаково для любой из пяти (ADR-113).
   */
  const handleRemove = async (note: InstallerNoteCard): Promise<void> => {
    if (busy) return;
    if (!(await ask(texts.noteRemoveConfirm(note.text)))) return;

    await run(() => api.removeNote(staffId, note.id));
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy || text.trim() === '') return;

    await run(() => api.addNote(staffId, text));
    setText('');
  };

  return (
    <Card as="section">
      <h2 className={styles.title}>{texts.notesTitle}</h2>
      <p className={styles.hint}>{texts.notesHint}</p>

      <form className={styles.add} onSubmit={submit} noValidate>
        {/* 🔴 Многострочное поле, а не однострочное (макет `CardTabs.png`):
            заметка о человеке — это наблюдение в две-три строки, и в строке
            ввода её начало уезжает за левый край, пока дописывают конец.

            Подпись заменена на aria-label: заголовок карточки уже сказал, что
            это заметки, и повторять его строкой выше — шум. */}
        <Textarea
          aria-label={texts.notesTitle}
          placeholder={texts.notePlaceholder}
          rows={3}
          wrapperClassName={styles.field}
          value={text}
          disabled={busy}
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={busy || text.trim() === ''}>
          {texts.noteAdd}
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className={styles.empty}>{texts.notesEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {notes.map((note) => (
            <li className={styles.note} key={note.id}>
              <time className={styles.when} dateTime={note.createdAt}>
                {texts.date(note.createdAt)}
              </time>
              <p className={styles.text}>{note.text}</p>
              <Button
                type="button"
                variant="light"
                size="sm"
                aria-label={texts.noteRemove}
                disabled={busy}
                onClick={() => void handleRemove(note)}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </Card>
  );
}
