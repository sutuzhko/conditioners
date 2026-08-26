'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { blocksOn, timeOfMinutes } from '@/entities/crm/lib/busy';
import { busyWindowTitle, crmBusyContent } from '@/entities/crm/content';
import { type DayKey, weekdayOf } from '@/shared/lib/calendar';
import { Button, Icon, useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { BlockDialog } from './BlockDialog';
import { WEEKDAY_TITLE, crmContent as texts } from './content';
import { removeBlock } from './lib';
import type { DayBlockCard, DayBlockDraft } from './model';
import styles from './DayBlockList.module.css';

/** Окно по умолчанию, когда «весь день» снимают: короткая отлучка, а не смена. */
const DEFAULT_FROM = 10 * 60;
const DEFAULT_TO = 12 * 60;

export interface DayBlockListProps {
  readonly day: DayKey;
  /** Занятость всей сетки: какая ляжет на этот день, решает домен. */
  readonly blocks: readonly DayBlockCard[];
  /** Кто смотрит: чужую занятость видно, но правит её только хозяин. */
  readonly viewerId: string;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

function emptyDraft(day: DayKey): DayBlockDraft {
  return {
    repeat: 'once',
    day,
    weekday: weekdayOf(day),
    allDay: true,
    from: timeOfMinutes(DEFAULT_FROM),
    to: timeOfMinutes(DEFAULT_TO),
    reason: '',
  };
}

function draftOf(block: DayBlockCard, day: DayKey): DayBlockDraft {
  return {
    repeat: block.repeat,
    day: block.day ?? day,
    weekday: block.weekday ?? weekdayOf(day),
    allDay: block.fromMin === null || block.toMin === null,
    from: timeOfMinutes(block.fromMin ?? DEFAULT_FROM),
    to: timeOfMinutes(block.toMin ?? DEFAULT_TO),
    reason: block.reason ?? '',
  };
}

/** «Весь день» или «14:00–16:00» — заголовок строки занятости. */
function whenTitle(block: DayBlockCard): string {
  if (block.fromMin === null || block.toMin === null) return crmBusyContent.full;
  return busyWindowTitle(block.fromMin, block.toMin);
}

/**
 * Занятость выбранного дня: кто и почему в этот день недоступен.
 *
 * 🔴 Заводит и снимает занятость каждый себе — это его врач и его дела.
 * Владелец видит чужую занятость, чтобы понимать, кого можно послать на
 * выезд, но снять её за человека не может: чужой выходной не его решение.
 */
export function DayBlockList({ day, blocks, viewerId, confirmRemove }: DayBlockListProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [draft, setDraft] = useState<DayBlockDraft | null>(null);
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const applied = blocksOn(day, blocks);

  const openNew = (): void => {
    setEditing(undefined);
    setDraft(emptyDraft(day));
  };

  const openEdit = (block: DayBlockCard): void => {
    setEditing(block.id);
    setDraft(draftOf(block, day));
  };

  const close = (): void => {
    setDraft(null);
    setEditing(undefined);
  };

  const saved = (): void => {
    close();
    router.refresh();
  };

  const drop = async (id: string): Promise<void> => {
    if (!(await ask(texts.busyRemoveConfirm))) return;

    setBusyId(id);
    setFailure(null);

    const result = await removeBlock(id);
    setBusyId(null);

    if (result.ok) router.refresh();
    else setFailure(result.message ?? texts.busyRemoveFailure);
  };

  return (
    <section className={styles.block} aria-label={texts.busyTitle}>
      <header className={styles.header}>
        <h3 className={styles.title}>{texts.busyTitle}</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={openNew}
          iconStart={<Icon name="clock" size={16} />}
        >
          {texts.busyAdd}
        </Button>
      </header>

      {failure === null ? null : (
        <p className={styles.failure} role="alert">
          {failure}
        </p>
      )}

      {applied.length === 0 ? (
        <p className={styles.empty}>{texts.busyEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {applied.map((block) => (
            <li
              className={[styles.item, block.fromMin === null ? styles.whole : styles.window]
                .filter(Boolean)
                .join(' ')}
              key={block.id}
            >
              <span className={styles.when}>
                {/* значок, а не только цвет: закрытый целиком день и отлучка на
                    два часа обязаны различаться и без различения цветов */}
                <Icon name={block.fromMin === null ? 'danger' : 'clock'} size={16} />
                {whenTitle(block)}
              </span>

              <span className={styles.about}>
                <span className={styles.who}>
                  {block.userId === viewerId ? texts.busyMine : block.userName}
                </span>

                {block.reason === null ? null : (
                  <span className={styles.reason}>{block.reason}</span>
                )}

                {block.repeat === 'weekly' ? (
                  <span className={styles.repeat}>
                    {`${texts.busyRepeatNote}: ${WEEKDAY_TITLE[block.weekday ?? weekdayOf(day)] ?? ''}`}
                  </span>
                ) : null}
              </span>

              {block.userId === viewerId ? (
                <span className={styles.actions}>
                  <button className={styles.action} type="button" onClick={() => openEdit(block)}>
                    {texts.busyEdit}
                  </button>
                  <button
                    className={`${styles.action} ${styles.danger}`}
                    type="button"
                    onClick={() => void drop(block.id)}
                    disabled={busyId === block.id}
                  >
                    {texts.busyDrop}
                  </button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {draft === null ? null : (
        <BlockDialog open onClose={close} onSaved={saved} draft={draft} id={editing} />
      )}

      {dialog}
    </section>
  );
}
