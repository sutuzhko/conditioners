/**
 * Фикстуры настроек для тестов страниц кластера. Живут рядом с чтением
 * настроек и документируют, что страница ждёт от репозитория.
 *
 * 🔴 Это выдуманная организация, а не реквизиты владельца: настоящие значения
 * заводятся в админке (инвариант 8).
 */
export const settingsFixture: Record<string, unknown> = {
  company: { name: 'Тест-Климат', tagline: '', foundedYear: null },
  contacts: {
    phones: ['+74872000000'],
    email: 'mail@example.test',
    telegram: '',
    whatsapp: '',
    hours: 'Пн–Вс, 8:00–21:00',
    responseTime: '15 минут',
    openingHours: ['Mo-Su 08:00-21:00'],
  },
  address: {
    country: 'RU',
    region: 'Тульская область',
    city: 'Тула',
    street: 'Проспект Ленина',
    building: '1',
    office: '',
    postalCode: '300000',
  },
  geo: { lat: 54.193, lng: 37.617 },
  area: { served: 'Тула и Тульская область' },
  /* Номера с верными контрольными разрядами: схема проверяет арифметику, а не
     длину (PROJECT §5.2), и «710000000000» она отвергает — группа тогда
     разбирается с умолчаниями и страница остаётся без реквизитов вовсе. */
  legal: {
    form: 'ИП',
    name: 'ИП Тестов Тест Тестович',
    inn: '710703123450',
    ogrn: '314710700012346',
    regDate: '2015-03-12',
    regAuthority: 'Межрайонная ИФНС России № 10 по Тульской области',
    /* Адрес регистрации предпринимателя — домашний, на сайт он не выводится;
       фикстура держит его, чтобы это было чем проверить. */
    address: '300000, Тула, проспект Ленина, 1',
    bankName: '',
    bankBik: '',
    bankAccount: '',
    bankCorrAccount: '',
  },
  warranty: { installation: '3 года', equipment: '2 года' },
  payment: { methods: ['Наличные'], vat: 'НДС не облагается' },
  social: { links: [] },
  seo: { homeTitle: '', homeDescription: '', titleSuffix: '', ogImage: '' },
  integrations: {
    metrikaId: '',
    messengerButtons: { telegram: false, whatsapp: false },
    callback: { enabled: true },
  },
};

/** Пустые настройки: владелец ещё ничего не заполнил — страница обязана жить. */
export const emptySettingsFixture: Record<string, unknown> = {};
