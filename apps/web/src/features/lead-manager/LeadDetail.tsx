'use client';

import { useRouter } from 'next/navigation';

import { LeadCardView } from './LeadCardView';
import { leadToClient, leadToOrder, patchLead } from './lib';
import type { LeadCard } from './model';

export interface LeadDetailProps {
  readonly lead: LeadCard;
}

/**
 * Открытое обращение — правая колонка раздела (issue #349).
 *
 * 🔴 Клиентский лист существует ровно затем, чтобы связать карточку с
 * набором запросов и обновлением страницы: функция не переживает границу
 * сервер→клиент, а карточка правит статус и заметку прямо на месте. Сами
 * данные приходят с сервера — второго их слепка на клиенте нет.
 */
export function LeadDetail({ lead }: LeadDetailProps) {
  const router = useRouter();

  return (
    <LeadCardView
      lead={lead}
      update={patchLead}
      toClient={leadToClient}
      toOrder={leadToOrder}
      /* Черновик наряда живёт своей страницей: раздел заявок не знает ни
         полей наряда, ни списка монтажников. */
      onOrder={(leadId) => router.push(`/admin/orders/new?lead=${leadId}`)}
      onChanged={() => router.refresh()}
    />
  );
}
