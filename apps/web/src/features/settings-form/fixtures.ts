/** Данные для историй и тестов форм настроек. */
import type { GroupDescriptor, SaveGroup, SaveResult } from './model';

export const contactsGroupFixture: GroupDescriptor = {
  key: 'contacts',
  title: 'Телефон и почта',
  description: 'Стоят в шапке, в футере и в разметке организации.',
  fields: [
    { path: 'phones', label: 'Телефоны', kind: 'list', itemLabel: 'Телефон' },
    { path: 'email', label: 'Почта', kind: 'text' },
    { path: 'hours', label: 'Часы работы', kind: 'text' },
  ],
};

export const legalGroupFixture: GroupDescriptor = {
  key: 'legal',
  title: 'Реквизиты',
  description: 'Показываются в футере и на странице контактов.',
  fields: [
    { path: 'form', label: 'Форма', kind: 'select', options: ['ИП', 'ООО'] },
    { path: 'inn', label: 'ИНН', kind: 'text' },
  ],
};

export const integrationsGroupFixture: GroupDescriptor = {
  key: 'integrations',
  title: 'Счётчики и кнопки',
  description: 'Яндекс.Метрика и кнопки мессенджеров.',
  fields: [
    { path: 'metrikaId', label: 'Номер счётчика', kind: 'text' },
    { path: 'messengerButtons.telegram', label: 'Кнопка Telegram', kind: 'checkbox' },
  ],
};

export const filledContacts = {
  phones: ['+74872000000'],
  email: 'mail@example.test',
  hours: 'Пн–Вс, 8:00–21:00',
};

export const acceptingSave: SaveGroup = async () => ({ ok: true });

export const rejectingSave: SaveGroup = async () => ({
  ok: false,
  message: 'Проверьте адрес почты',
  fieldErrors: { email: 'Проверьте адрес почты' },
});

/** Сохранение, которое не завершается: состояние «сохраняем» в истории. */
export const pendingSave: SaveGroup = () => new Promise<SaveResult>(() => {});
