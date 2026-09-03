/** Публичный API раздела заявок. */
export { LeadCardView, type LeadCardViewProps } from './LeadCardView';
export { LeadDetail, type LeadDetailProps } from './LeadDetail';
export { LeadQueue, type LeadQueueProps } from './LeadQueue';
export { leadManagerContent } from './content';
export { leadToClient, leadToOrder, patchLead } from './lib';
export { guessOrderType } from './order-type';
export {
  LEADS_PATH,
  LEAD_STATUSES,
  isLeadStatus,
  leadsHref,
  leadsQuery,
  type LeadCard,
  type LeadPatch,
  type LeadQueueItem,
  type LeadStatus,
  type LeadToClient,
  type LeadToClientResult,
  type LeadToOrder,
  type LeadToOrderResult,
  type LeadUpdate,
  type LeadsView,
} from './model';
