/** Публичный API раздела заявок. */
export { LeadCardView, type LeadCardViewProps } from './LeadCardView';
export { LeadList, type LeadListProps } from './LeadList';
export { leadManagerContent } from './content';
export { patchLead } from './lib';
export {
  LEAD_STATUSES,
  isLeadStatus,
  type LeadCard,
  type LeadPatch,
  type LeadStatus,
  type LeadUpdate,
} from './model';
