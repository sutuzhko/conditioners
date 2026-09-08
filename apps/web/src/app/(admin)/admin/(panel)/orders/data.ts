/**
 * Данные формы наряда: одни и те же для окна и для страницы за ним.
 *
 * 🔴 Перехватывающий маршрут рисует то же самое, что и прямой заход по адресу
 * (ADR-117). Второй запрос, собранный отдельно для окна, разошёлся бы с первым
 * на первой же правке — и окно предлагало бы не тех монтажников, что страница.
 */
import { notFound } from 'next/navigation';

import { leadManagerContent as leadTexts } from '@/features/lead-manager';
import {
  emptyOrderDraft,
  type OrderBlock,
  type OrderClientRef,
  type OrderDraft,
  type OrderInstallerRef,
  type OrderWorkSpan,
} from '@/features/order-manager';
import { requireOwnerPage } from '@/server/guards';
import type { WorkTypeMark } from '@/shared/lib/work-type';
import { listInstallers } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/clients';
import { findById as findLead } from '@/server/repo/leads';
import { listActive as listWorkTypes } from '@/server/repo/work-types';
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
  /** Виды работ из справочника: перечня в коде не осталось (ADR-343). */
  readonly workTypes: readonly WorkTypeMark[];
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
  const [lead, lists] = await Promise.all([orderLeadSource(params), orderFormLists()]);

  return { ...lists, lead };
}

/**
 * Обращение, из которого заводят наряд, — или `null`, если заводят с нуля.
 *
 * 🔴 Отдельная функция, потому что она решает **код ответа** (issue #651):
 * страница зовёт её до первого куска потока, и `?lead=` на удалённое
 * обращение отвечает честным 404, а не 200 с текстом «не найдено». Ею же
 * собирается заголовок страницы — он говорит, откуда взялся наряд.
 */
export async function orderLeadSource(params: OrderNewParams): Promise<OrderLeadSource | null> {
  await requireOwnerPage();

  const leadId = params.lead;
  if (leadId === undefined) return null;

  const lead = await findLead(leadId);
  if (lead === null) notFound();

  return {
    draft: {
      ...emptyOrderDraft(),
      /* 🔴 Вид работ берётся у обращения, а не угадывается по словам темы
         (ADR-343). До справочника здесь стоял `guessOrderType(lead.topic)` —
         разбор темы по корням слов; вместе со справочником он снят: у заявки
         вид работ теперь свой, а у старой заявки его нет, и подставлять
         угаданный честнее не становится. Не выбран — форма покажет первый вид
         справочника, и владелец поправит одним щелчком, пока наряд черновик. */
      workTypeId: lead.workType?.id ?? '',
      clientId: lead.clientId ?? '',
      address: lead.address ?? '',
      comment: lead.comment ?? '',
      leadId: lead.id,
    },
    from: leadTexts.orderFrom(lead.name, lead.topic),
  };
}

/** Списки и занятость для формы: к существованию обращения отношения не имеют. */
export async function orderFormLists(): Promise<Omit<OrderFormData, 'lead'>> {
  const session = await requireOwnerPage();

  /* Только работающие: назначать наряд человеку, у которого закрыт доступ,
     значит отправить его в пустоту — он не увидит наряд в панели. */
  const [clients, installers, workTypes, blocks, work] = await Promise.all([
    listAll(),
    listInstallers(true),
    listWorkTypes(),
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
    workTypes,
    blocks,
    work,
  };
}
