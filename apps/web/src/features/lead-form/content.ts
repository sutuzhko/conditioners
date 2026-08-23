import type { SelectOption } from '@/shared/ui';

/**
 * Подписи и списки вариантов формы заявки. Ни одного факта о компании: телефон
 * и адрес политики приходят пропсами (docs/CLAUDE.md, инвариант 8).
 *
 * Когда в shared/config появится общий каталог интерфейсных строк, файл
 * переезжает туда целиком — как и `widgets/footer/content.ts`.
 */

/** Темы обращения. Совпадают с темами, которые ждёт админка и уведомления. */
export const LEAD_TOPICS = [
  { value: 'Монтаж и установка', label: 'Монтаж и установка' },
  { value: 'Сервис и ремонт', label: 'Сервис и ремонт' },
  { value: 'ТО и чистка', label: 'ТО и чистка' },
  { value: 'Консультация', label: 'Консультация' },
] as const satisfies readonly SelectOption[];

export type LeadTopic = (typeof LEAD_TOPICS)[number]['value'];

/**
 * У необязательных списков первый вариант пустой: человек вправе не отвечать,
 * а пустое значение сервер сохранит как «не указано», а не как выдумку формы.
 */
export const PLACE_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Не указан' },
  { value: 'Квартира', label: 'Квартира' },
  { value: 'Частный дом', label: 'Частный дом' },
  { value: 'Офис', label: 'Офис' },
  { value: 'Коммерческое помещение', label: 'Коммерческое помещение' },
];

export const QTY_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Не знаю' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4 и более', label: '4 и более' },
];

/** Пустое значение здесь и означает «в любое время» — уточнения нет, и это норма. */
export const CALL_TIME_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'В любое время' },
  { value: 'Утром (9:00–12:00)', label: 'Утром (9:00–12:00)' },
  { value: 'Днём (12:00–17:00)', label: 'Днём (12:00–17:00)' },
  { value: 'Вечером (17:00–20:00)', label: 'Вечером (17:00–20:00)' },
];

export const leadFormContent = {
  formLabel: 'Форма заявки',
  requiredNote: 'Звёздочкой отмечены обязательные поля',

  nameLabel: 'Имя',
  namePlaceholder: 'Как к вам обращаться',
  phoneLabel: 'Телефон',
  phonePlaceholder: '+7 (___) ___-__-__',
  topicLabel: 'Тема обращения',
  placeLabel: 'Тип помещения',
  addressLabel: 'Адрес',
  addressPlaceholder: 'напр. ул. Оборонная, 12, кв. 34',
  qtyLabel: 'Количество кондиционеров',
  callTimeLabel: 'Удобное время звонка',
  commentLabel: 'Комментарий',
  commentPlaceholder: 'Площадь помещения, пожелания по модели...',
  photoLabel: 'Фото места установки',
  photoHint: 'По желанию: по фото стены точнее посчитаем трассу',

  consentLabel: 'Согласен на обработку персональных данных',
  consentPolicy: 'Политика обработки персональных данных',

  /** Подпись поля-ловушки. Её видит только робот, поэтому она правдоподобная. */
  honeypotLabel: 'Не заполняйте это поле',

  submit: 'Отправить заявку',
  submitting: 'Отправляем...',

  sendingAnnounce: 'Отправляем заявку',

  successTitle: 'Заявка отправлена',
  successThanks: (name: string) => `Спасибо, ${name}. Мы получили вашу заявку.`,
  successNext: 'Специалист перезвонит по указанному телефону, уточнит детали и назовёт цену.',
  successAnnounce: 'Заявка отправлена. Специалист перезвонит по указанному телефону',
  successAgain: 'Отправить ещё одну',

  errorFallbackLead: 'Если отправить не получается, позвоните:',
  errorNetwork:
    'Не удалось связаться с сервером. Проверьте интернет и попробуйте отправить ещё раз',
  errorRateLimited: 'Заявки уходят слишком часто. Подождите пару минут и попробуйте ещё раз',
  errorTooLarge: 'Фото слишком большое. Выберите файл поменьше и отправьте форму ещё раз',
  errorUnknown: 'Что-то пошло не так на нашей стороне. Попробуйте отправить ещё раз',
} as const;
