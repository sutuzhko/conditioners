'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Card, buttonClassName, useConfirm, type Confirm } from '@/shared/ui';

import { STOCK_ZONE_KIND_TITLES, stockManagerContent as texts } from './content';
import { StockZoneForm } from './StockZoneForm';
import { stockApi } from './lib';
import {
  STOCK_ZONE_NEW_PATH,
  zoneDraftOf,
  type StockApi,
  type StockZoneCard,
  type StockZonePerson,
} from './model';
import styles from './StockZones.module.css';

export interface StockZonesProps {
  readonly zones: readonly StockZoneCard[];
  /** За кем можно закрепить машину. */
  readonly people?: readonly StockZonePerson[] | undefined;
  readonly api?: StockApi | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmArchive?: Confirm | undefined;
}

/**
 * Зоны хранения: гараж и машины монтажников.
 *
 * 🔴 Ни одного названия зоны в коде (инвариант 8): свой гараж владелец
 * называет сам, и пустой раздел объясняет это словами, а не подставляет
 * «Склад» первой строкой.
 *
 * Зона не удаляется, а сдаётся в архив: движения, которые в ней были, остаются
 * в журнале — ради него склад и заводится (ADR-134).
 */
export function StockZones({
  zones,
  people = [],
  api = stockApi,
  confirmArchive,
}: StockZonesProps) {
  const { confirm, dialog } = useConfirm();
  const ask = confirmArchive ?? confirm;

  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const done = (): void => {
    setEditing(null);
    router.refresh();
  };

  const archive = async (zone: StockZoneCard): Promise<void> => {
    if (busy !== null) return;
    if (!(await ask(texts.zoneArchiveConfirm(zone.name)))) return;

    setBusy(zone.id);
    setMessage('');

    const result = await api.archiveZone(zone.id);
    setBusy(null);

    if (result.ok) {
      router.refresh();
      return;
    }
    setMessage(result.message);
  };

  /** Возврат из архива — обычная правка: тот же PATCH, только флагом. */
  const restore = async (zone: StockZoneCard): Promise<void> => {
    if (busy !== null) return;

    setBusy(zone.id);
    setMessage('');

    const result = await api.updateZone(zone.id, { ...zoneDraftOf(zone), archived: false });
    setBusy(null);

    if (result.ok) {
      router.refresh();
      return;
    }
    setMessage(result.message);
  };

  return (
    <Card as="section" className={styles.card}>
      <header className={styles.header}>
        <h2 className={styles.title}>{texts.zonesTitle}</h2>
        <p className={styles.hint}>{texts.zonesLead}</p>
      </header>

      {zones.length === 0 ? (
        <p className={styles.empty}>{texts.zonesEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {zones.map((zone) => (
            <li className={styles.item} key={zone.id}>
              {editing === zone.id ? (
                <StockZoneForm
                  api={api}
                  zoneId={zone.id}
                  initial={zoneDraftOf(zone)}
                  people={people}
                  onSaved={done}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <ZoneRow
                  zone={zone}
                  busy={busy === zone.id}
                  onEdit={() => setEditing(zone.id)}
                  onArchive={() => void archive(zone)}
                  onRestore={() => void restore(zone)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 🔴 Заведение — окном с собственным адресом (ADR-137): форма, выросшая
          под списком зон, уводит его вниз ровно тогда, когда на него смотрят.
          Правка при этом остаётся на месте строки — это короткое действие, и
          рядом с ней видно, что меняешь. */}
      <div className={styles.actions}>
        <Link
          className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          href={{ pathname: STOCK_ZONE_NEW_PATH }}
        >
          {texts.zoneAdd}
        </Link>
      </div>

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </Card>
  );
}

type ZoneRowProps = {
  readonly zone: StockZoneCard;
  readonly busy: boolean;
  readonly onEdit: () => void;
  readonly onArchive: () => void;
  readonly onRestore: () => void;
};

/** Одна зона: что это, как называется и чья она. */
function ZoneRow({ zone, busy, onEdit, onArchive, onRestore }: ZoneRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.body}>
        <div className={styles.line}>
          <span className={styles.name}>{zone.name}</span>
          <Badge variant={zone.kind === 'van' ? 'accent' : 'neutral'} size="sm">
            {STOCK_ZONE_KIND_TITLES[zone.kind]}
          </Badge>
          {zone.archived ? (
            <Badge variant="neutral" size="sm">
              {texts.zoneInArchive}
            </Badge>
          ) : null}
        </div>

        <p className={styles.owner}>
          {zone.kind === 'warehouse' ? texts.zoneUserNone : null}
          {/* Хозяин уволен — связь потеряна, и зону нужно переназначить: без
              неё монтажник не увидит свою машину. */}
          {zone.kind === 'van' && zone.userName === null ? (
            <span className={styles.lost}>{texts.zoneOwnerLost}</span>
          ) : null}
          {zone.kind === 'van' && zone.userName !== null
            ? texts.zoneOwnerLine(zone.userName)
            : null}
        </p>
      </div>

      <div className={styles.rowActions}>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onEdit}>
          {texts.zoneEdit}
        </Button>

        {zone.archived ? (
          <Button type="button" variant="ghost" size="sm" loading={busy} onClick={onRestore}>
            {texts.zoneRestore}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={styles.archive}
            loading={busy}
            onClick={onArchive}
          >
            {texts.zoneArchive}
          </Button>
        )}
      </div>
    </div>
  );
}
