'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { timeOfMinutes } from '@/entities/crm/lib/busy';
import { type DayKey, weekdayOf } from '@/shared/lib/calendar';
import { useConfirm } from '@/shared/ui';
import type { Confirm } from '@/shared/ui';

import { BlockDialog } from './BlockDialog';
import { CalendarActionsContext, type CalendarActions } from './actions';
import { CRM_PATH, crmContent as texts } from './content';
import { EventDialog } from './EventDialog';
import { removeBlock, removeEvent, updateEvent } from './lib';
import {
  DEFAULT_EVENT_MIN,
  MIN_EVENT_MIN,
  type CalendarOrderCard,
  type CrmEventDraft,
  type DayBlockCard,
  type DayBlockDraft,
} from './model';
import styles from './CalendarStage.module.css';

/** Время нового дела, когда его заводят из шапки, а не кликом по часу. */
const DEFAULT_TIME = '10:00';

/** Окно занятости по умолчанию, когда «весь день» снимают: короткая отлучка. */
const DEFAULT_FROM = 10 * 60;
const DEFAULT_TO = 12 * 60;

export interface CalendarStageProps {
  /** День, на который заводится запись из шапки календаря. */
  readonly day: DayKey;
  /** Кто смотрит: своя занятость правится, чужая только видна. */
  readonly viewerId: string;
  /** Занятость сетки — форма дела предупреждает о закрытом дне (ADR-115). */
  readonly blocks?: readonly DayBlockCard[] | undefined;
  /** Наряды сетки — форма дела предупреждает и о наложении на свой выезд. */
  readonly orders?: readonly CalendarOrderCard[] | undefined;
  /**
   * Заготовка из заявки: календарь открывается с уже заполненной формой, когда
   * на него пришли по кнопке «В календарь» из раздела заявок.
   */
  readonly preset?: Partial<CrmEventDraft> | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
  readonly children: ReactNode;
}

function emptyDraft(day: DayKey, preset?: Partial<CrmEventDraft>): CrmEventDraft {
  return {
    kind: 'call',
    day,
    time: DEFAULT_TIME,
    durationMin: DEFAULT_EVENT_MIN,
    clientName: '',
    clientPhone: '',
    address: '',
    note: '',
    leadId: null,
    ...preset,
  };
}

function emptyBlock(day: DayKey): DayBlockDraft {
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

type Editing = { readonly draft: CrmEventDraft; readonly id: string | undefined };
type EditingBlock = { readonly draft: DayBlockDraft; readonly id: string | undefined };

/**
 * Управляющий слой календаря: диалоги, подтверждения и объявления.
 *
 * 🔴 Сетка приходит с сервера готовой (инвариант 1) и лежит здесь `children`:
 * серверный компонент внутри клиентского — обычное дерево, а вот функция
 * границу не переживает, поэтому действия раздаются контекстом, а не пропсами.
 * Клиентскими остаются лист-запись, пустое место колонки и этот слой.
 *
 * 🔴 Правка идёт формой и для мыши, и для клавиатуры: перетаскивание только
 * подставляет другое время в тот же черновик (CRM §3.5.1).
 */
export function CalendarStage({
  day,
  viewerId,
  blocks = [],
  orders = [],
  preset,
  confirmRemove,
  children,
}: CalendarStageProps) {
  const router = useRouter();
  /* Подтверждение — общий диалог кита (ADR-113); проп остаётся швом для
     тестов, чтобы не открывать окно ради проверки удаления. */
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [event, setEvent] = useState<Editing | null>(
    preset === undefined ? null : { draft: emptyDraft(day, preset), id: undefined },
  );
  const [block, setBlock] = useState<EditingBlock | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const closeEvent = useCallback((): void => {
    setEvent(null);

    /* Форма, открытая из заявки, оставляла бы `?lead=` в адресе — и всплывала
       снова при каждом обновлении страницы. */
    if (preset !== undefined) router.replace(`${CRM_PATH}?view=day&day=${day}`);
  }, [day, preset, router]);

  const actions = useMemo<CalendarActions>(() => {
    const done = (message: string): void => {
      setNote(message);
      setFailure(null);
      router.refresh();
    };

    return {
      create: (at, fromMin, toMin) => {
        setFailure(null);
        setEvent({
          draft: emptyDraft(at, {
            ...(fromMin === undefined ? {} : { time: timeOfMinutes(fromMin) }),
            ...(fromMin === undefined || toMin === undefined
              ? {}
              : { durationMin: Math.max(toMin - fromMin, MIN_EVENT_MIN) }),
          }),
          id: undefined,
        });
      },

      edit: (target) => {
        setFailure(null);
        if (target.kind === 'event') setEvent({ draft: target.draft, id: target.id });
        else setBlock({ draft: target.draft, id: target.id });
      },

      remove: (target) => {
        void (async () => {
          const request = target.kind === 'event' ? texts.removeConfirm : texts.busyRemoveConfirm;
          if (!(await ask(request))) return;

          setPending(target.id);
          const result =
            target.kind === 'event' ? await removeEvent(target.id) : await removeBlock(target.id);
          setPending(null);

          if (result.ok) done(texts.removedNote);
          else setFailure(result.message ?? texts.removeFailure);
        })();
      },

      move: (id, draft) => {
        void (async () => {
          setPending(id);
          const result = await updateEvent(id, draft);
          setPending(null);

          if (result.ok) done(texts.movedNote(draft.time));
          else setFailure(result.message ?? texts.failure);
        })();
      },

      block: (at) => {
        setFailure(null);
        setBlock({ draft: emptyBlock(at), id: undefined });
      },

      pending,
    };
  }, [ask, pending, router]);

  /* Предупреждение в форме дела — о занятости самого́ смотрящего: дело
     заводят себе, и чужой выходной ему ничего не запрещает. */
  const myBlocks = blocks.filter((entry) => entry.userId === viewerId);

  return (
    <CalendarActionsContext.Provider value={actions}>
      {children}

      {/* Сетка перерисовывается молча: без объявления человек с экранным
          диктором не узнаёт, что запись сохранилась или переехала. */}
      <p className={styles.note} role="status" aria-live="polite">
        {note}
      </p>

      {failure === null ? null : (
        <p className={styles.failure} role="alert">
          {failure}
        </p>
      )}

      {event === null ? null : (
        <EventDialog
          open
          onClose={closeEvent}
          onSaved={() => {
            closeEvent();
            setNote(texts.savedNote);
            router.refresh();
          }}
          draft={event.draft}
          id={event.id}
          blocks={myBlocks}
          orders={orders}
          viewerId={viewerId}
        />
      )}

      {block === null ? null : (
        <BlockDialog
          open
          onClose={() => setBlock(null)}
          onSaved={() => {
            setBlock(null);
            setNote(texts.busySaved);
            router.refresh();
          }}
          draft={block.draft}
          id={block.id}
        />
      )}

      {dialog}
    </CalendarActionsContext.Provider>
  );
}
