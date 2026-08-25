'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Card, Input } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import type { InstallerNoteCard, StaffApi } from './model';
import styles from './InstallerNotes.module.css';

export interface InstallerNotesProps {
  readonly staffId: string;
  readonly notes: readonly InstallerNoteCard[];
  readonly api?: StaffApi | undefined;
}

/**
 * Заметки владельца о монтажнике.
 *
 * Монтажник их не видит — они и не приходят на его страницы: раздел целиком
 * закрыт `withOwner`, а не спрятан условием в разметке.
 */
export function InstallerNotes({ staffId, notes, api = staffApi }: InstallerNotesProps) {
  const router = useRouter();
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
        {/* Подпись поля заменена на aria-label: заголовок карточки уже сказал,
            что это заметки, и повторять его строкой выше — шум. */}
        <Input
          aria-label={texts.notesTitle}
          placeholder={texts.notePlaceholder}
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
                variant="ghost"
                size="sm"
                aria-label={texts.noteRemove}
                disabled={busy}
                onClick={() => void run(() => api.removeNote(staffId, note.id))}
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
    </Card>
  );
}
