/**
 * Данные формы наряда: одни и те же для окна и для страницы за ним.
 *
 * 🔴 Перехватывающий маршрут рисует то же самое, что и прямой заход по адресу
 * (ADR-117). Второй запрос, собранный отдельно для окна, разошёлся бы с первым
 * на первой же правке — и окно предлагало бы не тех монтажников, что страница.
 */
import { notFound } from 'next/navigation';

import { guessOrderType, leadManagerContent as leadTexts } from '@/features/lead-manager';
import {
  emptyOrderDraft,
  type OrderBlock,
  type OrderClientRef,
  type OrderDraft,
  type OrderInstallerRef,
  type OrderWorkSpan,
} from '@/features/order-manager';
import { requireOwnerPage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/clients';
import { findById as findLead } from '@/server/repo/leads';
import { todayKey } from '@/shared/lib/calendar';

import { loadBlocks, loadWork } from './blocks';

/** Обращение, из которого заводят наряд: черновик и подпись «кто и с чем». */
export type OrderLeadSource = {
  readonly draft: OrderDraft;
  readonly from: string;
};

export type OrderFormData = {
  readonly clients: readonly OrderClientRef[];
  readonly installers: readonly OrderInstallerRef[];
  readonly blocks: readonly OrderBlock[];
  readonly work: readonly OrderWorkSpan[];
  readonly lead: OrderLeadSource | null;
};

export type OrderNewParams = { readonly lead?: string | undefined };

/**
 * Клиенты, монтажники и занятость для формы заведения.
 *
 * 🔴 Роль проверяется здесь, до первого обращения к репозиторию (ADR-095):
 * страж выше страницы успевает сменить адрес, но не остановить чтение, и
 * телефоны клиентов с суммами нарядов уехали бы монтажнику в теле ответа.
 * Наряды себе он не выписывает — это раздел владельца.
 *
 * 🔴 Наряд из обращения заводится тем же адресом, параметром `?lead=`, а не
 * отдельным экраном в разделе заявок: форма и правила у наряда одни. Клиента и
 * статус обращения к этому моменту уже перевёл `POST /api/admin/leads/{id}/order`
 * — здесь только чтение: переход по ссылке не меняет ничего в базе.
 */
export async function orderFormData(params: OrderNewParams): Promise<OrderFormData> {
  const session = await requireOwnerPage();

  const leadId = params.lead;
  const lead = leadId === undefined ? null : await findLead(leadId);
  if (leadId !== undefined && lead === null) notFound();

  /* Только работающие: назначать наряд человеку, у которого закрыт доступ,
     значит отправить его в пустоту — он не увидит наряд в панели. */
  const [clients, installers, blocks, work] = await Promise.all([
    listAll(),
    listInstallers(true),
    /* Занятость вокруг сегодняшнего дня: наряд заводят, пока клиент на линии,
       и чаще всего на ближайшие дни. */
    loadBlocks(session, todayKey()),
    loadWork(session, todayKey()),
  ]);

  return {
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
    })),
    installers: installers.map((staff) => ({
      id: staff.id,
      name: staff.name,
      login: staff.login,
      employment: staff.employment,
    })),
    blocks,
    work,
    lead:
      lead === null
        ? null
        : {
            draft: {
              ...emptyOrderDraft(),
              type: guessOrderType(lead.topic),
              clientId: lead.clientId ?? '',
              address: lead.address ?? '',
              comment: lead.comment ?? '',
              leadId: lead.id,
            },
            from: leadTexts.orderFrom(lead.name, lead.topic),
          },
  };
}
