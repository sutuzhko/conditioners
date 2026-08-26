/** Публичный API раздела клиентов. */
export { ClientAdd, type ClientAddProps } from './ClientAdd';
export { ClientCardView, type ClientCardViewProps } from './ClientCardView';
export { ClientForm, type ClientFormProps } from './ClientForm';
export { ClientLeads, type ClientLeadsProps } from './ClientLeads';
export { ClientList, type ClientListProps } from './ClientList';
export { ClientSearch, type ClientSearchProps } from './ClientSearch';
export { clientManagerContent } from './content';
export { clientApi } from './lib';
export {
  ADMIN_PAGE_SIZE,
  pageNumber,
  type ClientApi,
  type ClientCard,
  type ClientDraft,
  type ClientLead,
  type ClientPage,
  type ClientResult,
} from './model';
