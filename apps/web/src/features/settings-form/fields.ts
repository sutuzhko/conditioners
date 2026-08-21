/**
 * Подписи и способ ввода для каждой группы настроек.
 *
 * 🔴 Здесь нет ни одного значения — только подписи. Сами данные компании
 * живут в базе (инвариант 8); подсказка вида «например, +7 4872 …» тоже не
 * пишется: пример телефона рядом с полем телефона владелец однажды сохранит.
 */
import type { GroupDescriptor } from './model';

export const SETTINGS_GROUPS: readonly GroupDescriptor[] = [
  {
    key: 'company',
    title: 'Название и описание',
    description: 'Как компания называется на сайте и в поисковой выдаче.',
    fields: [
      { path: 'name', label: 'Название', kind: 'text' },
      {
        path: 'legalName',
        label: 'Полное наименование',
        kind: 'text',
        hint: 'Как в документах — попадает в реквизиты и в разметку организации',
      },
      { path: 'tagline', label: 'Короткое описание', kind: 'text' },
      { path: 'foundedYear', label: 'Год основания', kind: 'number' },
    ],
  },
  {
    key: 'contacts',
    title: 'Телефон и почта',
    description:
      'Стоят в шапке, в футере и в разметке организации. Яндекс сверяет их с Яндекс.Бизнесом — расхождение бьёт по выдаче.',
    fields: [
      {
        path: 'phones',
        label: 'Телефоны',
        kind: 'list',
        itemLabel: 'Телефон',
        hint: 'Первый показывается в шапке. Номер приводится к единому виду при сохранении',
      },
      { path: 'email', label: 'Почта', kind: 'text' },
      { path: 'telegram', label: 'Telegram', kind: 'text' },
      { path: 'whatsapp', label: 'WhatsApp', kind: 'text' },
      { path: 'hours', label: 'Часы работы для человека', kind: 'text' },
      {
        path: 'openingHours',
        label: 'Часы работы для разметки',
        kind: 'list',
        itemLabel: 'Интервал',
        hint: 'Формат «Mo-Su 08:00-21:00». Смысл обязан совпадать с часами выше',
      },
      {
        path: 'responseTime',
        label: 'Обещанный срок ответа',
        kind: 'text',
        hint: 'Пусто — сайт не обещает срок вовсе. Выдуманное обещание хуже, чем никакого',
      },
    ],
  },
  {
    key: 'address',
    title: 'Адрес',
    description:
      'По частям: разметка адреса требует отдельных полей, а Яндекс.Бизнес сверяет их построчно.',
    fields: [
      { path: 'country', label: 'Код страны', kind: 'text', hint: 'Две буквы, например RU' },
      { path: 'region', label: 'Регион', kind: 'text' },
      { path: 'city', label: 'Город', kind: 'text' },
      { path: 'street', label: 'Улица', kind: 'text' },
      { path: 'building', label: 'Дом', kind: 'text' },
      { path: 'office', label: 'Офис', kind: 'text' },
      { path: 'postalCode', label: 'Индекс', kind: 'text' },
    ],
  },
  {
    key: 'geo',
    title: 'Координаты на карте',
    description: 'Точка организации в разметке и на карте контактов.',
    fields: [
      { path: 'lat', label: 'Широта', kind: 'number' },
      { path: 'lng', label: 'Долгота', kind: 'number' },
    ],
  },
  {
    key: 'area',
    title: 'Регион работы',
    description: 'Куда выезжаете. Попадает в разметку зоны обслуживания.',
    fields: [
      { path: 'served', label: 'Зона обслуживания', kind: 'text' },
      { path: 'districts', label: 'Районы', kind: 'list', itemLabel: 'Район' },
    ],
  },
  {
    key: 'legal',
    title: 'Реквизиты',
    description: 'Показываются в футере и на странице контактов.',
    fields: [
      { path: 'form', label: 'Форма', kind: 'select', options: ['ИП', 'ООО'] },
      { path: 'name', label: 'Наименование', kind: 'text' },
      { path: 'inn', label: 'ИНН', kind: 'text' },
      {
        path: 'ogrn',
        label: 'ОГРН / ОГРНИП',
        kind: 'text',
        hint: 'Подпись на сайте подставляется по выбранной форме',
      },
      { path: 'address', label: 'Юридический адрес', kind: 'text' },
    ],
  },
  {
    key: 'warranty',
    title: 'Гарантия',
    description: 'Условия из блока о гарантии и со страницы установки.',
    fields: [
      { path: 'installation', label: 'На монтаж', kind: 'longText' },
      { path: 'equipment', label: 'На оборудование', kind: 'longText' },
    ],
  },
  {
    key: 'payment',
    title: 'Оплата',
    description: 'Способы оплаты и режим налогообложения.',
    fields: [
      { path: 'methods', label: 'Способы оплаты', kind: 'list', itemLabel: 'Способ' },
      { path: 'vat', label: 'НДС', kind: 'text' },
    ],
  },
  {
    key: 'social',
    title: 'Соцсети',
    description: 'Ссылки в футере. Пустая строка не показывается, битая — хуже отсутствия.',
    fields: [{ path: 'links', label: 'Ссылки', kind: 'list', itemLabel: 'Ссылка' }],
  },
  {
    key: 'seo',
    title: 'Метаданные главной',
    description: 'Заголовок и описание страницы в поисковой выдаче.',
    fields: [
      { path: 'homeTitle', label: 'Заголовок главной', kind: 'text' },
      { path: 'homeDescription', label: 'Описание главной', kind: 'longText' },
      {
        path: 'titleSuffix',
        label: 'Приписка к заголовкам',
        kind: 'text',
        hint: 'Добавляется к заголовку каждой страницы',
      },
      { path: 'ogImage', label: 'Картинка для соцсетей', kind: 'text' },
    ],
  },
  {
    key: 'achievements',
    title: 'Цифры первого экрана',
    /* 🔴 Подпись предупреждает прямо: выдуманный счётчик выполненных работ
       запрещён инвариантом 10 и ФЗ «О рекламе». Оставить пусто — рабочее
       состояние, полосы просто не будет. */
    description:
      'Полоса под заголовком главной. Цифры должны быть настоящими: выдуманный счётчик выполненных работ — это обман в рекламе, а не маркетинг. Пусто — полосы нет.',
    fields: [
      {
        path: 'items',
        label: 'Цифры',
        kind: 'objectList',
        itemLabel: 'Цифра',
        maxItems: 4,
        hint: 'Число и хвост показываются слитно: 1200 и «+» дадут «1200+». Склонение — за вами: «3» и « года».',
        columns: [
          { key: 'value', label: 'Число', kind: 'number', grow: 1 },
          { key: 'suffix', label: 'Хвост', kind: 'text', grow: 1 },
          { key: 'label', label: 'Подпись', kind: 'text', grow: 3 },
        ],
      },
    ],
  },
  {
    key: 'integrations',
    title: 'Счётчики и кнопки',
    description:
      'Яндекс.Метрика и кнопки мессенджеров. Онлайн-чата нет намеренно: общение идёт через заявку и Telegram.',
    fields: [
      { path: 'metrikaId', label: 'Номер счётчика Яндекс.Метрики', kind: 'text' },
      { path: 'messengerButtons.telegram', label: 'Кнопка Telegram', kind: 'checkbox' },
      { path: 'messengerButtons.whatsapp', label: 'Кнопка WhatsApp', kind: 'checkbox' },
      { path: 'callback.enabled', label: 'Кнопка обратного звонка', kind: 'checkbox' },
    ],
  },
];
