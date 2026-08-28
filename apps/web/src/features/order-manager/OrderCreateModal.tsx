'use client';

import { useState } from 'react';

import { RouteModal, useRouteClose } from '@/shared/ui';

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
  blocks,
  work,
  initial,
  title = texts.addTitle,
  hint = texts.addHint,
  api,
}: OrderCreateModalProps) {
  const close = useRouteClose(ORDERS_PATH);

  /**
   * 🔴 Несохранённый ввод — это любое изменение в форме. Признак снимается
   * событием, а не полями: наряд — два десятка полей и список позиций, и
   * правило «чем считать заполненным», разложенное по ним, разошлось бы на
   * первой правке. Ложное срабатывание тут дешевле пропуска: лишний вопрос
   * стоит одного клика, потерянная форма — звонка клиента (ADR-141).
   *
   * 🔴 Именно `onChange`, а не `onInput`. У `<select>` нативный `input`
   * приходит раньше `change`: перерисовка от `setDirty` откатывает управляемый
   * список к прежнему значению, и первый выбор пропадает молча. В наряде
   * списков три — клиент, монтажник, статус, — и потерянный монтажник стоит
   * дороже всего. React'овский `onChange` приходит и на каждый символ в
   * текстовом поле, так что ничего не теряется.
   */
  const [dirty, setDirty] = useState(false);

  return (
    <RouteModal title={title} description={hint} size="lg" fallbackHref={ORDERS_PATH} dirty={dirty}>
      <div onChange={() => setDirty(true)}>
        <OrderForm
          api={api}
          clients={clients}
          installers={installers}
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
            setDirty(false);
            close({ refresh: true });
          }}
        />
      </div>
    </RouteModal>
  );
}
