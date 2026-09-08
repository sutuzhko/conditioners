'use client';

import type { WorkTypeOption } from '@/shared/lib/work-type';
import { RouteModal, useRouteClose, useUnsavedInput } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import { OrderForm } from './OrderForm';
import {
  ORDERS_PATH,
  type OrderApi,
  type OrderBlock,
  type OrderClientRef,
  type OrderDraft,
  type OrderInstallerRef,
  type OrderWorkSpan,
} from './model';

export interface OrderCreateModalProps {
  /** Списки приходят готовыми: их читает страница, окно в базу не ходит. */
  readonly clients: readonly OrderClientRef[];
  readonly installers: readonly OrderInstallerRef[];
  /** Виды работ из справочника — перечня в коде нет (ADR-343). */
  readonly workTypes: readonly WorkTypeOption[];
  /** Занятость: форма предупреждает о ней, но назначать не мешает (ADR-115). */
  readonly blocks?: readonly OrderBlock[] | undefined;
  readonly work?: readonly OrderWorkSpan[] | undefined;
  /** Черновик из обращения, когда наряд заводят по заявке. */
  readonly initial?: OrderDraft | undefined;
  /** Подписи окна: наряд по обращению называется иначе, чем наряд с нуля. */
  readonly title?: string | undefined;
  readonly hint?: string | undefined;
  readonly api?: OrderApi | undefined;
}

/**
 * Заведение наряда — окном с собственным адресом (ADR-117).
 *
 * 🔴 Окно, а не отдельный экран: наряд заводят, стоя в списке и держа клиента
 * на линии, и уходить из отфильтрованного списка ради формы незачем. Правка
 * при этом остаётся страницей — карточка наряда это работа, расход, фото и
 * история, и в окно она не переезжает.
 *
 * Окно самое широкое из тех, что даёт кит (`lg`): форма наряда — самая длинная
 * в панели, и на 560 пикселях её поля встают в одну колонку, растягивая
 * прокрутку вдвое. Прокрутка внутри окна всё равно остаётся, и это осознанная
 * плата: содержимое под окном при этом не двигается.
 */
export function OrderCreateModal({
  clients,
  installers,
  workTypes,
  blocks,
  work,
  initial,
  title = texts.addTitle,
  hint = texts.addHint,
  api,
}: OrderCreateModalProps) {
  const close = useRouteClose(ORDERS_PATH);

  /**
   * 🔴 Несохранённый ввод — это любое изменение в форме: и правка поля, и
   * нажатие кнопки. Признак снимается китом, а не полями: наряд — два десятка
   * полей и список позиций, и правило «чем считать заполненным», разложенное
   * по ним, разошлось бы на первой правке. Ложное срабатывание тут дешевле
   * пропуска: лишний вопрос стоит одного клика, потерянная форма — звонка
   * клиента (ADR-141).
   *
   * Списков в наряде три — клиент, монтажник, статус, — и потерянный
   * монтажник стоит дороже всего: почему признак снимается с `change`, а не с
   * `input`, написано в `useUnsavedInput` (ADR-144).
   */
  const unsaved = useUnsavedInput();

  return (
    <RouteModal
      title={title}
      description={hint}
      size="lg"
      fallbackHref={ORDERS_PATH}
      dirty={unsaved.dirty}
    >
      <div {...unsaved.scope}>
        <OrderForm
          api={api}
          clients={clients}
          installers={installers}
          workTypes={workTypes}
          blocks={blocks}
          work={work}
          initial={initial}
          surface="bare"
          onSaved={() => {
            /* Сохранили — окно уходит само, а список под ним обновляется:
               заведённый наряд обязан появиться в нём сразу.

               🔴 Обновление просится у кита пропуском, а не своим
               `router.refresh()` рядом с закрытием: «назад» — это переход, и
               запрос, начатый до него, роутер отбрасывает. */
            unsaved.markSaved();
            close({ refresh: true });
          }}
        />
      </div>
    </RouteModal>
  );
}
