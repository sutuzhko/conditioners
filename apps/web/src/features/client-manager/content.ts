/** Подписи раздела клиентов. */
import type { ConfirmRequest } from '@/shared/ui';
import { formatDateShort } from '@/shared/lib/format';
import { plural } from '@/shared/lib/plural';

export const clientManagerContent = {
  title: 'Клиенты',
  lead: 'Люди, с которыми компания работает: телефон, адрес и история обращений. Клиент заводится из обращения или руками — по телефону он в базе один.',

  emptyTitle: 'В базе пока никого',
  emptyText:
    'Заведите первого клиента или нажмите «В клиенты» на карточке обращения — данные подставятся сами.',
  emptyFound: 'По этому запросу никого не нашлось.',

  searchLabel: 'Поиск клиента',
  searchHint: 'Имя, адрес или любой кусок телефона',
  searchPlaceholder: 'Соколов, Первомайская, 910 155',
  search: 'Найти',
  searchReset: 'Сбросить',
  found: (total: number): string => `Найдено: ${total}`,
  totalCount: (total: number): string => `Всего в базе: ${total}`,

  addOpen: 'Добавить клиента',
  addClose: 'Свернуть форму',
  addTitle: 'Новый клиент',
  addHint: 'Телефон — ключ: по нему клиент опознаётся при следующем обращении.',
  add: 'Добавить',
  adding: 'Добавляем…',
  added: 'Клиент заведён',

  name: 'Имя',
  phone: 'Телефон',
  address: 'Адрес',
  addressHint: 'Куда выезжать: улица, дом, квартира',
  note: 'Заметка',
  noteHint: 'Что важно помнить: этаж, домофон, особенности объекта',

  /** Подпись даты появления в списке: рядом с ней стоит сама дата. */
  sinceLabel: 'В базе',

  cardTitle: 'Данные клиента',
  cardHint: 'Правка не трогает обращения: в них остаётся то, что человек прислал сам.',
  save: 'Сохранить',
  saving: 'Сохраняем…',
  saved: 'Сохранено',

  remove: 'Удалить клиента',
  removeConfirm: (who: string): ConfirmRequest => ({
    title: `Удалить карточку «${who}»?`,
    description: 'Обращения этого человека останутся — у них своё согласие на обработку данных.',
    confirmLabel: 'Удалить карточку',
  }),
  removeHint:
    'Удаление карточки — в том числе по требованию человека (152-ФЗ). Обращения при этом сохраняются.',

  unitsTitle: 'Установленная техника',
  unitsHint:
    'Появляется сама после выполненного монтажа: модель, дата и снимок — из наряда. Что стоит у человека, отвечает сразу на три вопроса: гарантия это или платный ремонт, когда звать на ТО и что ему уже продали.',
  unitsEmpty:
    'Техника не записана. После выполненного монтажа она появится здесь сама — или добавьте руками то, что поставили раньше.',

  unitAdd: 'Добавить технику',
  unitAddClose: 'Свернуть форму',
  unitAddTitle: 'Новая запись',
  unitAddHint:
    'Для техники, поставленной до этой системы или не нами: из наряда запись заводится сама.',
  unitEditTitle: 'Правка записи',
  unitEditHint: 'Дата монтажа задаёт и гарантию, и срок ТО — от неё считается всё остальное.',

  unitModel: 'Что стоит',
  unitModelHint: 'Модель, как в наряде: «Сплит-система 09»',
  unitInstalledAt: 'Дата монтажа',
  unitWarrantyUntil: 'Гарантия до',
  unitWarrantyHint: 'Из наряда считается по сроку из настроек. Пусто — гарантия не записана',

  unitSave: 'Сохранить',
  unitSaving: 'Сохраняем…',
  unitAdding: 'Добавляем…',
  unitCancel: 'Отмена',
  unitEdit: 'Изменить',
  unitRemove: 'Удалить',
  unitRemoveConfirm: (model: string): ConfirmRequest => ({
    title: `Удалить запись «${model}»?`,
    description:
      'Техника исчезнет из карточки клиента. Наряд, из которого она выросла, останется на месте.',
    confirmLabel: 'Удалить запись',
  }),

  unitInstalled: (iso: string): string => `Монтаж ${clientManagerContent.date(iso)}`,
  unitWarranty: (iso: string): string => `Гарантия до ${clientManagerContent.date(iso)}`,
  unitWarrantyOver: (iso: string): string => `Гарантия истекла ${clientManagerContent.date(iso)}`,
  unitWarrantyNone: 'Гарантия не записана',

  /* 🔴 Обещать напоминание, которого нет, нельзя: генератор дел о ТО — отдельная
     работа (CRM.md §8.4). Пока это дата, от которой считает владелец, и текст
     говорит ровно это. */
  unitService: (iso: string): string =>
    `ТО через год от монтажа — ${clientManagerContent.date(iso)}`,
  unitServiceNote:
    'Даты ТО считаются от монтажа. Напоминаний система пока не присылает — звонить нужно самим.',

  unitOrder: (number: number): string => `Наряд № ${number}`,
  unitPhotoAlt: (model: string): string => `Установка: ${model}`,

  leadsTitle: 'Обращения',
  leadsHint: 'Всё, что этот человек присылал с сайта.',
  leadsEmpty: 'Обращений с сайта нет: клиент заведён руками или пришёл по звонку.',
  leadsOpen: 'Все обращения',
  leadCount: (count: number): string =>
    count === 0
      ? 'без обращений'
      : `${count} ${plural(count, 'обращение', 'обращения', 'обращений')}`,

  open: 'Карточка',
  back: '← Все клиенты',
  since: (iso: string): string => `в базе с ${clientManagerContent.date(iso)}`,

  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',
  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',

  /** Даты — по Москве: работа идёт в Туле, а не в поясе того, кто смотрит. */
  date: (iso: string): string => formatDateShort(iso),
} as const;
