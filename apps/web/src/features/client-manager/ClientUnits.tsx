'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Card, useConfirm, type Confirm } from '@/shared/ui';

import { ClientUnitForm } from './ClientUnitForm';
import { clientManagerContent as texts } from './content';
import { clientUnitApi } from './lib';
import {
  dayOf,
  serviceDueDay,
  warrantyOver,
  type ClientUnitApi,
  type ClientUnitCard,
} from './model';
import styles from './ClientUnits.module.css';

/** Размер миниатюры. Числом: `next/image` требует ширину и высоту (инвариант 13). */
const THUMB = 96;

export interface ClientUnitsProps {
  readonly clientId: string;
  readonly units: readonly ClientUnitCard[];
  /**
   * Сегодняшний день в поясе работ, приходит с сервера. Считать его в браузере
   * значило бы получить два мнения о том, истекла ли гарантия: у сервера своё,
   * у машины смотрящего — своё, и разметка после гидратации прыгала бы.
   */
  readonly today: string;
  /** Действия раздела. Подменяются в историях и тестах, чтобы не поднимать сеть. */
  readonly api?: ClientUnitApi | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/**
 * Техника, стоящая у клиента.
 *
 * 🔴 Список появляется сам из выполненного монтажа (CRM.md §3.2): модель, дата
 * и снимок берутся из наряда, гарантия считается по сроку из настроек. Руками
 * добавляют то, что поставили до этой системы или не мы.
 *
 * 🔴 Дата ТО считается от монтажа и ничего не обещает: генератор напоминаний —
 * отдельная работа (CRM.md §8.4). Подпись «ТО — 14 июля» из прототипа выглядела
 * обещанием, которого никто не давал.
 */
export function ClientUnits({
  clientId,
  units,
  today,
  api = clientUnitApi,
  confirmRemove,
}: ClientUnitsProps) {
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const done = (): void => {
    setAdding(false);
    setEditing(null);
    router.refresh();
  };

  const handleRemove = async (unit: ClientUnitCard): Promise<void> => {
    if (removing !== null) return;
    if (!(await ask(texts.unitRemoveConfirm(unit.model)))) return;

    setRemoving(unit.id);
    setMessage('');

    const result = await api.remove(clientId, unit.id);
    setRemoving(null);

    if (result.ok) {
      router.refresh();
      return;
    }
    setMessage(result.message);
  };

  return (
    <Card as="section" className={styles.card}>
      <header className={styles.header}>
        <h2 className={styles.title}>{texts.unitsTitle}</h2>
        <p className={styles.hint}>{texts.unitsHint}</p>
      </header>

      {units.length === 0 ? (
        <p className={styles.empty}>{texts.unitsEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {units.map((unit) => (
            <li className={styles.item} key={unit.id}>
              {editing === unit.id ? (
                <ClientUnitForm
                  clientId={clientId}
                  unit={unit}
                  api={api}
                  onSaved={done}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <UnitRow
                  unit={unit}
                  today={today}
                  busy={removing === unit.id}
                  onEdit={() => setEditing(unit.id)}
                  onRemove={() => void handleRemove(unit)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <p className={styles.note}>{texts.unitServiceNote}</p>

      {adding ? (
        <ClientUnitForm
          clientId={clientId}
          api={api}
          onSaved={done}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div className={styles.actions}>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAdding(true)}>
            {texts.unitAdd}
          </Button>
        </div>
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

type UnitRowProps = {
  readonly unit: ClientUnitCard;
  readonly today: string;
  readonly busy: boolean;
  readonly onEdit: () => void;
  readonly onRemove: () => void;
};

/** Одна единица техники: что стоит, с какого числа и до какого гарантия. */
function UnitRow({ unit, today, busy, onEdit, onRemove }: UnitRowProps) {
  const installDay = dayOf(unit.installedAt);
  const service = serviceDueDay(installDay);
  const expired = unit.warrantyUntil !== null && warrantyOver(dayOf(unit.warrantyUntil), today);

  return (
    <div className={styles.row}>
      {unit.photo === null ? null : (
        <Image
          className={styles.photo}
          src={unit.photo}
          alt={texts.unitPhotoAlt(unit.model)}
          width={THUMB}
          height={THUMB}
        />
      )}

      <div className={styles.body}>
        <div className={styles.line}>
          <span className={styles.model}>{unit.model}</span>
          <Warranty until={unit.warrantyUntil} expired={expired} />
        </div>

        <p className={styles.facts}>
          <time dateTime={installDay}>{texts.unitInstalled(unit.installedAt)}</time>
          {unit.order === null ? null : (
            <Link className={styles.order} href={{ pathname: `/admin/orders/${unit.order.id}` }}>
              {texts.unitOrder(unit.order.number)}
            </Link>
          )}
        </p>

        <p className={styles.service}>
          <time dateTime={service}>{texts.unitService(service)}</time>
        </p>
      </div>

      <div className={styles.rowActions}>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onEdit}>
          {texts.unitEdit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={styles.remove}
          loading={busy}
          onClick={onRemove}
        >
          {texts.unitRemove}
        </Button>
      </div>
    </div>
  );
}

/** Плашка гарантии: действует, истекла или не записана вовсе. */
function Warranty({
  until,
  expired,
}: {
  readonly until: string | null;
  readonly expired: boolean;
}) {
  if (until === null)
    return (
      <Badge variant="neutral" size="sm">
        {texts.unitWarrantyNone}
      </Badge>
    );

  return (
    <Badge variant={expired ? 'warning' : 'success'} size="sm">
      {expired ? texts.unitWarrantyOver(until) : texts.unitWarranty(until)}
    </Badge>
  );
}
