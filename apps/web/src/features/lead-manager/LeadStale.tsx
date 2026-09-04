import { Alert, ButtonLink } from '@/shared/ui';

import { leadManagerContent as texts } from './content';
import { LEADS_PATH } from './model';

export interface LeadStaleProps {
  /** Самое старое непринятое обращение: номер и когда оно пришло. */
  readonly number: number;
  readonly leadId: string;
}

/**
 * Плашка о залежавшемся обращении (issue #601, макет `Leads.png`).
 *
 * 🔴 То, ради чего раздел открывают утром. Она называет номер и объясняет цену
 * молчания словами, а не подсвечивает строку красным: подсветка сообщает «тут
 * что-то не так», а не «человек ждёт больше суток и, скорее всего, уже звонит
 * конкуренту».
 *
 * Считается по базе, а не по видимой странице очереди: залежавшееся обращение
 * лежит на четвёртой странице — именно поэтому оно и залежалось.
 */
export function LeadStale({ number, leadId }: LeadStaleProps) {
  return (
    <Alert
      tone="warning"
      title={texts.staleTitle(number)}
      action={
        <ButtonLink
          href={{ pathname: LEADS_PATH, query: { lead: leadId } }}
          size="sm"
          variant="bordered"
        >
          {texts.staleOpen}
        </ButtonLink>
      }
    >
      {texts.staleText}
    </Alert>
  );
}
