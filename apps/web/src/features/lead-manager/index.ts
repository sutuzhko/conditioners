/** Публичный API раздела заявок. */
export { LeadCardView, type LeadCardViewProps } from './LeadCardView';
export { LeadList, type LeadListProps } from './LeadList';
export { leadManagerContent } from './content';
export { leadToClient, leadToOrder, patchLead } from './lib';
export { guessOrderType } from './order-type';
export {
  LEAD_STATUSES,
  isLeadStatus,
  type LeadCard,
  type LeadPatch,
  type LeadStatus,
  type LeadToClient,
  type LeadToClientResult,
  type LeadToOrder,
  type LeadToOrderResult,
  type LeadUpdate,
} from './model';
