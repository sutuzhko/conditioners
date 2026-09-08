import { leadManagerContent as leadTexts } from '@/features/lead-manager';
import { OrderCreateModal } from '@/features/order-manager';
import { requireOwnerPage } from '@/server/guards';

import { orderFormData } from '../../data';

export const dynamic = 'force-dynamic';

/**
 * Окно «Новый наряд» поверх списка.
 *
 * 🔴 Проверка роли стоит в самом загрузчике данных (ADR-095): страж выше
 * страницы успевает сменить адрес, но не остановить чтение. Заводить наряды
 * может только владелец, и то, чего монтажнику знать не положено, — телефоны
 * клиентов и вознаграждения — до него не доезжает вовсе.
 */
export default async function AdminOrderNewModal({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  /* 🔴 Страж стоит и здесь, хотя загрузчик данных зовёт его тоже: проверка
     обязана быть видна в самой странице (ADR-095, issue #773). Загрузчик —
     соседний модуль, и его переиспользуют: страница, собранная из другого
     набора вызовов, молча остаётся без роли. Сессия читается один раз за
     запрос — `getAdminSession` обёрнута в `cache`, — так что второй вызов
     ничего не стоит. */
  await requireOwnerPage();

  const { clients, installers, workTypes, blocks, work, lead } = await orderFormData(
    await searchParams,
  );

  return (
    <OrderCreateModal
      clients={clients}
      installers={installers}
      workTypes={workTypes}
      blocks={blocks}
      work={work}
      {...(lead === null
        ? {}
        : {
            initial: lead.draft,
            title: leadTexts.orderFormTitle,
            hint: `${lead.from}. ${leadTexts.orderFormHint}`,
          })}
    />
  );
}
