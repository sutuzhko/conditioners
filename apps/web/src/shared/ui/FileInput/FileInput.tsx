'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { BYTES_IN_MB, UPLOAD_MAX_MB } from '@/shared/config/uploads';
import { Field } from '../internal/Field';
import { useFieldIds } from '../internal/useFieldIds';
import { IconButton } from '../IconButton/IconButton';
import styles from './FileInput.module.css';
import { Icon } from '../Icon';

/** Микрокопия по умолчанию. Переопределяется пропсами, если форме нужен свой тон. */
const TEXTS = {
  prompt: 'Выберите фото или перетащите сюда',
  remove: 'Удалить фото',
  previewAlt: 'Загруженное фото',
  tooLarge: (limit: number) => `Файл больше ${limit} МБ — сожмите или выберите другой`,
  wrongType: 'Нужен файл изображения: JPEG, PNG, WebP или HEIC',
} as const;

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;

export interface FileInputProps {
  onChange: (file: File | null) => void;
  value?: File | null | undefined;
  label?: string | undefined;
  hint?: string | undefined;
  /** ошибка снаружи — например, отказ сервера; она перекрывает внутреннюю */
  error?: string | undefined;
  accept?: readonly string[] | undefined;
  maxSizeMb?: number | undefined;
  id?: string | undefined;
  name?: string | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  promptText?: string | undefined;
  previewAlt?: string | undefined;
  className?: string | undefined;
}

function matchesAccept(file: File, accept: readonly string[]): boolean {
  return accept.some((pattern) =>
    pattern.endsWith('/*') ? file.type.startsWith(pattern.slice(0, -1)) : file.type === pattern,
  );
}

function formatSize(bytes: number): string {
  return `${(bytes / BYTES_IN_MB).toFixed(1)} МБ`;
}

export function FileInput({
  onChange,
  value = null,
  label,
  hint,
  error,
  accept = DEFAULT_ACCEPT,
  // предел тот же, что проверяет сервер (docs/API.md §7): иначе форма
  // пропустит файл, который сервер отвергнет уже после отправки
  maxSizeMb = UPLOAD_MAX_MB,
  id,
  name,
  disabled,
  required,
  promptText = TEXTS.prompt,
  previewAlt = TEXTS.previewAlt,
  className,
}: FileInputProps) {
  const [ownError, setOwnError] = useState<string | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shownError = error ?? ownError;
  const { fieldId, hintId, errorId, describedBy, invalid } = useFieldIds({
    id,
    hint,
    error: shownError,
  });

  // объектная ссылка живёт ровно столько, сколько показывается превью:
  // без revoke браузер держит файл в памяти до перезагрузки вкладки
  useEffect(() => {
    if (value === null) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const accepts = (file: File): string | undefined => {
    if (!matchesAccept(file, accept)) return TEXTS.wrongType;
    if (file.size > maxSizeMb * BYTES_IN_MB) return TEXTS.tooLarge(maxSizeMb);
    return undefined;
  };

  const take = (file: File | undefined) => {
    if (file === undefined) return;

    const problem = accepts(file);
    setOwnError(problem);
    onChange(problem === undefined ? file : null);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    take(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled === true) return;
    take(event.dataTransfer.files[0]);
  };

  const clear = () => {
    setOwnError(undefined);
    if (inputRef.current !== null) inputRef.current.value = '';
    onChange(null);
  };

  return (
    <Field
      fieldId={fieldId}
      label={label}
      hint={hint}
      hintId={hintId}
      error={shownError}
      errorId={errorId}
      required={required}
      className={className}
    >
      <input
        ref={inputRef}
        type="file"
        id={fieldId}
        name={name}
        className={`srOnly ${styles.input}`}
        accept={accept.join(',')}
        disabled={disabled}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={handleChange}
      />
      <label
        htmlFor={fieldId}
        className={[
          styles.dropzone,
          dragging ? styles.dragging : null,
          invalid ? styles.invalid : null,
          disabled === true ? styles.disabled : null,
        ]
          .filter(Boolean)
          .join(' ')}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Icon name="camera" size={22} className={styles.icon} />
        <span className={styles.texts}>
          <span className={styles.title}>{promptText}</span>
          <span>до {maxSizeMb} МБ</span>
        </span>
      </label>

      {value === null || previewUrl === null ? null : (
        <div className={styles.preview}>
          {/* превью локального файла: next/image здесь неприменим —
              blob-ссылка живёт только в этой вкладке */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.thumb} src={previewUrl} alt={previewAlt} width={64} height={64} />
          <span className={styles.meta}>
            <span className={styles.name}>{value.name}</span>
            <span className={styles.size}>{formatSize(value.size)}</span>
          </span>
          <IconButton
            label={TEXTS.remove}
            variant="outline"
            size="sm"
            onClick={clear}
            icon={<Icon name="close" size={16} />}
          />
        </div>
      )}
    </Field>
  );
}
