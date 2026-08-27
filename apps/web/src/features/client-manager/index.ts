/** Публичный API раздела клиентов. */
export { ClientAdd, type ClientAddProps } from './ClientAdd';
export { ClientCardView, type ClientCardViewProps } from './ClientCardView';
export { ClientForm, type ClientFormProps } from './ClientForm';
export { ClientLeads, type ClientLeadsProps } from './ClientLeads';
export { ClientList, type ClientListProps } from './ClientList';
export { ClientSearch, type ClientSearchProps } from './ClientSearch';
export { ClientUnitForm, type ClientUnitFormProps } from './ClientUnitForm';
export { ClientUnits, type ClientUnitsProps } from './ClientUnits';
export { clientManagerContent } from './content';
export { clientApi, clientUnitApi } from './lib';
export {
  ADMIN_PAGE_SIZE,
  pageNumber,
  type ClientApi,
  type ClientCard,
  type ClientDraft,
  type ClientLead,
  type ClientPage,
  type ClientResult,
  type ClientUnitApi,
  type ClientUnitCard,
  type ClientUnitDraft,
} from './model';
