/** Публичный API раздела клиентов. */
export { ClientCardView, type ClientCardViewProps } from './ClientCardView';
export { ClientCreateModal, type ClientCreateModalProps } from './ClientCreateModal';
export { ClientForm, type ClientFormProps } from './ClientForm';
export { ClientLeads, type ClientLeadsProps } from './ClientLeads';
export { ClientList, type ClientListProps } from './ClientList';
export { ClientOrders, type ClientOrdersProps } from './ClientOrders';
export { ClientSearch, type ClientSearchProps } from './ClientSearch';
export { ClientUnitForm, type ClientUnitFormProps } from './ClientUnitForm';
export { ClientUnits, type ClientUnitsProps } from './ClientUnits';
export { CLIENT_TAB_TITLES, clientManagerContent } from './content';
export { clientApi, clientUnitApi } from './lib';
export {
  ADMIN_PAGE_SIZE,
  CLIENTS_PATH,
  CLIENT_CARD_TABS,
  CLIENT_NEW_PATH,
  clientCardTabFromParam,
  pageNumber,
  type ClientApi,
  type ClientCard,
  type ClientCardTab,
  type ClientDraft,
  type ClientLead,
  type ClientOrder,
  type ClientOrders as ClientOrdersData,
  type ClientPage,
  type ClientResult,
  type ClientUnitApi,
  type ClientUnitCard,
  type ClientUnitDraft,
} from './model';
