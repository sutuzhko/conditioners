'use client';

import { useRef, useState, type FormEvent } from 'react';

import { Button, Card, Icon, IconButton, Select, useConfirm, type Confirm } from '@/shared/ui';

import { ORDER_DOC_KIND_TITLE, orderManagerContent as texts } from './content';
import {
  ORDER_DOC_KINDS,
  isOrderDocKind,
  type OrderDocCard,
  type OrderDocKind,
  type OrderWorkApi,
} from './model';
import styles from './OrderDocs.module.css';

export interface OrderDocsProps {
  readonly api: OrderWorkApi;
  readonly docs: readonly OrderDocCard[];
  /** Прикладывает и убирает документы только владелец (docs/CRM.md §9). */
  readonly editable?: boolean | undefined;
  readonly onChanged?: (() => void) | undefined;
  /** Подтверждение выведено пропом: тесты и истории не открывают окно. */
  readonly confirmRemove?: Confirm | undefined;
}

const KIND_OPTIONS = ORDER_DOC_KINDS.map((value) => ({
  value,
  label: ORDER_DOC_KIND_TITLE[value],
}));

/** PDF и сканы: то же, что принимает сервер по сигнатуре файла. */
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

/**
 * Документы наряда: договор, акт, гарантийный талон, счёт, замерный лист.
 *
 * 🔴 Ссылка ведёт на закрытый маршрут панели, а не в общий том загрузок:
 * договор — персональные данные клиента, и открываться он должен только тому,
 * у кого есть сессия и доступ к этому наряду (docs/CRM.md §9). Ходить за
 * файлом через `next/image` или предпросмотр нельзя по той же причине —
 * оптимизатор ходит за картинкой сам, без cookie смотрящего.
 *
 * Поле файла здесь своё, а не `FileInput` из кита: тот показывает превью
 * снимка, а PDF в превью даёт битую картинку.
 */
export function OrderDocs({
  api,
  docs,
  editable = false,
  onChanged,
  confirmRemove,
}: OrderDocsProps) {
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<OrderDocKind>('contract');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy || file === null) return;

    setBusy(true);
    setMessage('');

    const result = await api.addDoc(kind, file);
    setBusy(false);

    if (result.ok) {
      setFile(null);
      if (fileRef.current !== null) fileRef.current.value = '';
      onChanged?.();
      return;
    }
    setMessage(result.message);
  };

  const remove = async (doc: OrderDocCard): Promise<void> => {
    if (busy) return;

    const confirmed = await ask({
      title: texts.docRemoveAsk,
      description: texts.docRemoveText,
      confirmLabel: texts.docRemoveConfirm,
    });
    if (!confirmed) return;

    setBusy(true);
    setMessage('');

    const result = await api.removeDoc(doc.id);
    setBusy(false);

    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message);
  };

  return (
    <Card as="section" aria-labelledby="order-docs-title">
      <h2 className={styles.title} id="order-docs-title">
        {texts.docsTitle}
      </h2>
      <p className={styles.hint}>{texts.docsHint}</p>

      {docs.length === 0 ? (
        <p className={styles.empty}>{editable ? texts.docsEmpty : texts.docsEmptyInstaller}</p>
      ) : (
        <ul className={styles.list}>
          {docs.map((doc) => (
            <li className={styles.item} key={doc.id}>
              <Icon className={styles.icon} name="bill" size={20} />

              <a
                className={styles.link}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                aria-label={texts.docOpen(doc.name)}
              >
                {doc.name}
              </a>

              <span className={styles.meta}>
                {ORDER_DOC_KIND_TITLE[doc.kind]} · {texts.docSize(doc.sizeBytes)}
              </span>

              {editable ? (
                <IconButton
                  label={texts.docRemove(doc.name)}
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  icon={<Icon name="close" size={16} />}
                  onClick={() => void remove(doc)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {editable ? (
        <form className={styles.add} onSubmit={submit} noValidate>
          <Select
            label={texts.docKind}
            options={KIND_OPTIONS}
            value={kind}
            disabled={busy}
            wrapperClassName={styles.kind}
            onChange={(event) => {
              if (isOrderDocKind(event.target.value)) setKind(event.target.value);
            }}
          />

          <div className={styles.fileField}>
            <label className={styles.fileLabel} htmlFor="order-doc-file">
              {texts.docFile}
            </label>
            <input
              ref={fileRef}
              className={styles.file}
              id="order-doc-file"
              type="file"
              accept={ACCEPT}
              disabled={busy}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setMessage('');
              }}
            />
            <span className={styles.fileHint}>{texts.docFileHint}</span>
          </div>

          <Button type="submit" size="sm" disabled={busy || file === null} loading={busy}>
            {busy ? texts.docAdding : texts.docAdd}
          </Button>
        </form>
      ) : null}

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </Card>
  );
}
