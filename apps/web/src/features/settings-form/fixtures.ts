/** Данные для историй и тестов форм настроек. */
import { LEGAL_GROUP } from './fields';
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

/**
 * Реквизиты берутся настоящей группой, а не упрощённой копией: истории и тесты
 * показывают ровно тот состав полей и те подсказки, которые увидит владелец
 * (ADR-112). Копия разошлась бы с описанием на первой же правке подписи.
 */
export const legalGroupFixture: GroupDescriptor = LEGAL_GROUP;

/**
 * Реквизиты предпринимателя.
 *
 * 🔴 Номера настоящие по контрольному разряду: схема проверяет арифметику, а
 * не длину (PROJECT §5.2), и выдуманный номер историю бы не прошёл.
 */
export const filledEntrepreneur = {
  form: 'ИП',
  name: 'Иванов Иван Иванович',
  inn: '710703123450',
  ogrn: '314710700012346',
  regDate: '2015-03-12',
  regAuthority: 'Межрайонная ИФНС России № 10 по Тульской области',
  address: 'г. Тула, ул. Замочная, д. 1, кв. 2',
  bankName: 'Тульское отделение № 8604 ПАО Сбербанк',
  bankBik: '047003608',
  bankAccount: '40702810700000000001',
  bankCorrAccount: '30101810700000000004',
};

/** Реквизиты общества: те же поля значат другое, плюс КПП и руководитель. */
export const filledCompany = {
  form: 'ООО',
  name: 'Общество с ограниченной ответственностью «Пример»',
  shortName: 'ООО «Пример»',
  inn: '7107023451',
  kpp: '710701001',
  ogrn: '1027107001239',
  address: 'г. Тула, пр-т Ленина, д. 1, офис 3',
  director: 'Иванов Иван Иванович',
  directorTitle: 'Генеральный директор',
  bankName: 'Тульское отделение № 8604 ПАО Сбербанк',
  bankBik: '047003608',
  bankAccount: '40702810700000000001',
  bankCorrAccount: '30101810700000000004',
};

/** Группа ещё не заполнена: смена формы тут ничего не отнимает. */
export const emptyEntrepreneur = { form: 'ИП' };

export const integrationsGroupFixture: GroupDescriptor = {
  key: 'integrations',
  title: 'Счётчики и кнопки',
  description: 'Яндекс.Метрика и кнопки мессенджеров.',
  fields: [
    { path: 'metrikaId', label: 'Номер счётчика', kind: 'text' },
    { path: 'messengerButtons.telegram', label: 'Кнопка Telegram', kind: 'checkbox' },
  ],
};

export const achievementsGroupFixture: GroupDescriptor = {
  key: 'achievements',
  title: 'Цифры первого экрана',
  description: 'Полоса под заголовком главной.',
  fields: [
    {
      path: 'items',
      label: 'Цифры',
      kind: 'objectList',
      itemLabel: 'Цифра',
      maxItems: 4,
      columns: [
        { key: 'value', label: 'Число', kind: 'text' },
        { key: 'suffix', label: 'Хвост', kind: 'text' },
        { key: 'label', label: 'Подпись', kind: 'text' },
      ],
    },
  ],
};

export const filledAchievements = {
  items: [
    { value: '1200', suffix: '+', label: 'установок' },
    { value: '3', suffix: ' года', label: 'гарантии' },
  ],
};

/** Предел из схемы: четыре цифры — больше в полосу не помещается. */
export const fullAchievements = {
  items: [
    { value: '1200', suffix: '+', label: 'установок' },
    { value: '3', suffix: ' года', label: 'гарантии' },
    { value: '1', suffix: ' день', label: 'на монтаж' },
    { value: '24', suffix: ' ч', label: 'на ответ' },
  ],
};

export const filledContacts = {
  phones: ['+74872000000'],
  email: 'mail@example.test',
  hours: 'Пн–Вс, 8:00–21:00',
};

/**
 * Рабочее окно: девять утра — семь вечера. Хранится минутами от московской
 * полуночи, а не строкой «09:00» — время в поле собирает форма (ADR-138).
 */
export const filledSchedule = { fromMin: 9 * 60, toMin: 19 * 60 };

export const acceptingSave: SaveGroup = async () => ({ ok: true });

export const rejectingSave: SaveGroup = async () => ({
  ok: false,
  message: 'Проверьте адрес почты',
  fieldErrors: { email: 'Проверьте адрес почты' },
});

/** Сохранение, которое не завершается: состояние «сохраняем» в истории. */
export const pendingSave: SaveGroup = () => new Promise<SaveResult>(() => {});
