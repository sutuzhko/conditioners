import { z } from 'zod';

import { installRatesSchema } from '@/entities/price/model';
import {
  isBankAccount,
  isBik,
  isCorrAccount,
  isInnCompany,
  isInnPerson,
  isKpp,
  isOgrn,
  isOgrnip,
} from '@/shared/lib/requisites';

import { SETTING_PLACEHOLDER } from './lib/readiness';

/**
 * Настройки: всё, что владелец правит сам.
 *
 * 🔴 Здесь живёт каждый факт о компании — название, телефон, адрес, реквизиты,
 * координаты. Ни один из них не имеет права появиться в коде (инвариант 8,
 * ADR-009). Расхождение NAP-данных с Яндекс.Бизнесом бьёт по локальной выдаче,
 * а разные телефоны в шапке и футере — типовой способ их получить.
 *
 * Группы намеренно снисходительны к пустоте: владелец заполняет их постепенно,
 * и запрещать сохранение половины формы нельзя. Готовность к запуску проверяет
 * отдельная функция — `lib/readiness`.
 *
 * 🔴 Схемы едины для формы админки и для админ-API: репозиторий держал свою
 * копию, она не знала про `trassaIncludedM` и `heightFloorFrom` из ADR-029 —
 * владелец сохранял включённые метры трассы, а калькулятор считал по
 * умолчаниям. Источник истины один, здесь (ADR-030).
 *
 * Группы закрыты `.strict()`: настройки приходят из формы админки, и лишний
 * ключ в теле запроса — это опечатка в имени поля, а не расширение схемы.
 */

/** Строка, которую можно оставить пустой. Предел — защита от вставки статьи в поле. */
const optionalText = z.string().trim().max(300).default('');

/** Многострочное поле: описание для выдачи, условия гарантии. */
const optionalLongText = z.string().trim().max(2000).default('');

/**
 * Телефон приводится к единому виду `+7XXXXXXXXXX`: он попадает и в `tel:`,
 * и в разметку `HVACBusiness`, и в Яндекс.Бизнес — три разных написания
 * одного номера поисковик считает тремя организациями.
 *
 * В базе номер хранится машинным, человеку его показывает `formatPhone`: она
 * знает, что у тульского городского номера код из четырёх цифр, и не режет
 * его на «+7 (487) 2…». Всё, что на российский номер не похоже (в том числе
 * заглушка сидов), остаётся как есть — иначе заглушка перестанет быть заметной.
 */
export function normalizeSettingPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 10) return `+7${digits}`;
  return raw.trim();
}

export const phoneSettingSchema = z.string().trim().max(60).transform(normalizeSettingPhone);

/**
 * Машиночитаемое расписание для `openingHours` в JSON-LD: `Mo-Su 08:00-21:00`.
 * Формат проверяется, потому что число в разметке обязано совпадать с видимым
 * текстом (инвариант 9), а невалидную строку поисковик молча выбросит.
 */
const OPENING_HOURS_PATTERN =
  /^(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?(,(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?)* ([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

const openingHoursSchema = z
  .string()
  .trim()
  .regex(OPENING_HOURS_PATTERN, 'Часы для разметки: «Mo-Su 08:00-21:00»');

/** Ссылка: либо пусто, либо настоящий адрес — битая ссылка в футере хуже её отсутствия. */
const optionalUrl = z.union([z.literal(''), z.string().trim().url('Ссылка указана неверно')]);

/**
 * 🔴 Полного наименования здесь нет намеренно (ADR-106): оно живёт в группе
 * `legal` — там же, где форма собственности, ИНН и ОГРН, — и печатается в
 * реквизитах футера. Второе такое поле в этой группе уезжало в разметку, не
 * показываясь на сайте, и разошлось с видимым текстом (инвариант 9).
 */
export const companySchema = z
  .object({
    name: optionalText,
    tagline: optionalText,
    // из формы число приходит строкой — приводим здесь, а не в обработчике
    foundedYear: z.coerce.number().int().min(1900).max(2100).nullable().default(null),
  })
  .strict();

export const contactsSchema = z
  .object({
    phones: z.array(phoneSettingSchema).max(5).default([]),
    /**
     * Заглушка сидов пропускается явным литералом: пока владелец не заполнил
     * почту, сохранять группу можно, но мусор вместо адреса — нельзя.
     */
    email: z
      .union([
        z.literal(''),
        z.literal(SETTING_PLACEHOLDER),
        z.string().trim().email('Проверьте адрес почты'),
      ])
      .default(''),
    telegram: optionalText,
    whatsapp: optionalText,
    /** Часы работы для человека: «Пн–Вс, 8:00–21:00». */
    hours: optionalText,
    /**
     * Обещанный срок ответа на заявку: «15 минут». Измеримое обещание — это
     * факт о компании (инвариант 8), задаёт его владелец, а не вёрстка.
     * Пусто — секция заявки не обещает срок вовсе: выдумать хуже, чем смолчать.
     */
    responseTime: optionalText,
    /**
     * То же самое в формате schema.org (`Mo-Su 08:00-21:00`). Хранится отдельно,
     * потому что человеческая запись и машинная должны совпадать по смыслу, а
     * вывести одну из другой надёжно нельзя (инвариант 9).
     */
    openingHours: z.array(openingHoursSchema).max(7).default([]),
  })
  .strict();

/**
 * Адрес хранится по частям: `PostalAddress` в JSON-LD требует отдельных полей,
 * а Яндекс.Бизнес сверяет их построчно. Из частей всегда можно собрать строку,
 * из строки части — нет.
 */
export const addressSchema = z
  .object({
    country: z.string().trim().length(2, 'Код страны из двух букв, например RU').default('RU'),
    region: optionalText,
    city: optionalText,
    street: optionalText,
    building: optionalText,
    office: optionalText,
    postalCode: optionalText,
  })
  .strict();

export const geoSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).nullable().default(null),
    lng: z.coerce.number().min(-180).max(180).nullable().default(null),
  })
  .strict();

/**
 * Зона обслуживания. Два поля, потому что у них разные читатели.
 *
 * `served` — полный список городов и районов. Он идёт в контакты и в разметку
 * `areaServed`: там перечисление работает на локальную выдачу, и чем оно
 * подробнее, тем лучше.
 *
 * 🔴 `promise` — короткая строка капсулы первого экрана: город и срок выезда.
 * Список городов туда не идёт (ADR-126): он занимал самую дорогую строку
 * страницы и не помещался в капсулу, а длину его владелец меняет из админки.
 * Пусто — капсулы нет вовсе; подставлять вместо неё полный список нельзя,
 * иначе первый экран снова сломается на шестом городе.
 */
export const areaSchema = z
  .object({
    served: optionalText,
    promise: z
      .string()
      .trim()
      .max(90, { message: 'Слишком длинно для капсулы первого экрана' })
      .default(''),
  })
  .strict();

/**
 * Реквизиты продавца — ЗоЗПП ст. 9 и Правила продажи (ПП РФ № 2463).
 *
 * 🔴 Состав полей задаёт форма регистрации (ADR-112, PROJECT §5.1): у
 * предпринимателя нет КПП и руководителя, у общества — органа регистрации.
 * Поэтому здесь размеченное объединение, а не один объект с необязательными
 * полями: поле чужой формы не прячется, его не существует. Спрятанное
 * значение всплывает в выгрузке или в разметке ровно тогда, когда его никто
 * не ждёт, — а `.strict()` не даёт записать его даже запросом мимо формы.
 *
 * Самозанятого в списке форм нет: перепродавать чужой товар под НПД нельзя
 * (ФЗ-422), а продажа техники — суть проекта. Ограничение реализовано
 * отсутствием пункта, а не проверкой в рантайме: проверять нечего, если
 * выбрать нельзя.
 */
export const LEGAL_FORMS = ['ИП', 'ООО'] as const;

export type LegalForm = (typeof LEGAL_FORMS)[number];

/**
 * Пробелы из номера вычищаются, заглушка сидов остаётся как есть.
 *
 * Владелец копирует реквизит из выписки вместе с пробелами — «7707 083893»
 * это особенность источника, а не ошибка человека. А вот заглушку трогать
 * нельзя: без пробелов она перестанет совпадать с собой, и проверка
 * готовности её не найдёт.
 */
function withoutSpaces(value: string): string {
  return value === SETTING_PLACEHOLDER ? value : value.replace(/\s/g, '');
}

/**
 * Реквизит с контрольным разрядом: ИНН, ОГРН, ОГРНИП, КПП, БИК.
 *
 * 🔴 Проверяется арифметика, а не длина строки (PROJECT §5.2). Описка в
 * цифре видна в футере и в политике обработки ПДн, живёт там годами и
 * всплывает в самый неудачный момент; контрольный разряд ловит и опечатку, и
 * переставленные цифры.
 *
 * Пустое значение проходит: группа заполняется постепенно, и запрещать
 * сохранение половины формы нельзя — незаполненное показывает проверка
 * готовности. Заглушка сидов проходит по той же причине, что и в почте: пока
 * владелец до реквизитов не дошёл, на сайте обязана стоять заметная метка, а
 * не пустота.
 */
function requisite(check: (value: string) => boolean, message: string) {
  return z
    .string()
    .trim()
    .transform(withoutSpaces)
    .refine((value) => value === '' || value === SETTING_PLACEHOLDER || check(value), { message })
    .default('');
}

/**
 * Дата регистрации — календарная, `2015-03-12`.
 *
 * Строкой в машинном виде, а не свободным текстом: её печатают в реквизитах
 * рядом с органом регистрации, и «12.03.15» против «12 марта 2015 г.» в двух
 * местах сайта — это то же расхождение, ради которого телефон приводится к
 * одному виду. Заглушки сидов здесь нет: датой она быть не может, и
 * незаполненную дату честнее показать пустой.
 */
const registrationDateSchema = z
  .union(
    [
      z.literal(''),
      z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((value) => {
          // отдельная проверка календаря: `2015-02-30` шаблон проходит, а даты такой нет
          const parsed = new Date(`${value}T00:00:00.000Z`);
          return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
        }),
    ],
    { errorMap: () => ({ message: 'Дата регистрации — как в свидетельстве' }) },
  )
  .default('');

/**
 * Счёт: двадцать цифр. Контрольный ключ считается вместе с БИК, поэтому
 * сходимость проверяется на группе — полю соседнее значение недоступно.
 */
const accountSchema = z
  .string()
  .trim()
  .transform(withoutSpaces)
  .refine((value) => value === '' || value === SETTING_PLACEHOLDER || /^\d{20}$/.test(value), {
    message: 'Номер счёта — 20 цифр',
  })
  .default('');

/**
 * Банковские реквизиты одинаковы у обеих форм и на сайт не выводятся никогда:
 * они нужны счетам, а витрине там делать нечего (PROJECT §5.1).
 */
const bankFields = {
  bankName: optionalText,
  bankBik: requisite(isBik, 'БИК — девять цифр, начинается с 04'),
  bankAccount: accountSchema,
  bankCorrAccount: accountSchema,
};

/** Индивидуальный предприниматель: ФИО, ОГРНИП, дата и орган регистрации. */
const entrepreneurLegalSchema = z
  .object({
    form: z.literal('ИП'),
    /** ФИО полностью. Форму собственности подставляет показ, а не владелец. */
    name: optionalText,
    inn: requisite(isInnPerson, 'ИНН предпринимателя — 12 цифр, проверьте номер'),
    ogrn: requisite(isOgrnip, 'ОГРНИП — 15 цифр, проверьте номер'),
    regDate: registrationDateSchema,
    regAuthority: optionalText,
    /**
     * 🔴 Адрес регистрации предпринимателя на сайт не выводится: это, как
     * правило, домашний адрес, то есть персональные данные (PROJECT §5.1).
     * Хранится он для документов, а посетителю показывается фактический
     * адрес приёма из группы `address`. За то, что он не уедет на страницу,
     * отвечает `publicRequisites` в `lib/legal`.
     */
    address: optionalText,
    ...bankFields,
  })
  .strict();

/** Общество с ограниченной ответственностью: КПП, руководитель, место нахождения. */
const companyLegalSchema = z
  .object({
    form: z.literal('ООО'),
    /** Полное фирменное наименование, как в уставе. */
    name: optionalText,
    /** Сокращённое: «ООО „Пример“». Им подписан футер. */
    shortName: optionalText,
    inn: requisite(isInnCompany, 'ИНН организации — 10 цифр, проверьте номер'),
    kpp: requisite(isKpp, 'КПП — девять знаков: инспекция, причина постановки и номер'),
    ogrn: requisite(isOgrn, 'ОГРН — 13 цифр, проверьте номер'),
    /** Место нахождения — публичное, в отличие от адреса предпринимателя. */
    address: optionalText,
    director: optionalText,
    directorTitle: optionalText,
    ...bankFields,
  })
  .strict();

/**
 * Сходимость счёта с БИК. Номер, верный в одном банке, в другом неверен,
 * поэтому проверка стоит на группе: полю соседнее значение недоступно.
 */
function checkAccounts(
  legal: { bankBik: string; bankAccount: string; bankCorrAccount: string },
  ctx: z.RefinementCtx,
): void {
  const filled = (value: string): boolean => value !== '' && value !== SETTING_PLACEHOLDER;

  const accounts = [
    {
      path: 'bankAccount',
      value: legal.bankAccount,
      check: isBankAccount,
      message: 'Расчётный счёт не сходится с БИК — проверьте номер',
    },
    {
      path: 'bankCorrAccount',
      value: legal.bankCorrAccount,
      check: isCorrAccount,
      message: 'Корреспондентский счёт не сходится с БИК — проверьте номер',
    },
  ] as const;

  /* Про незаполненный БИК говорится один раз, даже когда без ключа осталось
     два счёта: замечание про одно и то же поле, повторённое дважды, в отчёте
     готовности читается как две разные недоделки. */
  let bikReported = false;

  for (const account of accounts) {
    if (!filled(account.value)) continue;

    if (!filled(legal.bankBik)) {
      if (!bikReported) {
        bikReported = true;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bankBik'],
          message: 'Без БИК контрольный ключ счёта не проверить',
        });
      }
      continue;
    }

    if (!account.check(account.value, legal.bankBik)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [account.path], message: account.message });
    }
  }
}

/**
 * Группа без формы разбирается как «ИП»: так она открывалась до появления
 * вариантов, и старая запись обязана открыться, а не уронить публичную
 * страницу. Всё, что объектом не является, проходит мимо и честно
 * отвергается объединением.
 */
function withDefaultForm(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;

  return 'form' in value ? value : { ...value, form: LEGAL_FORMS[0] };
}

export const legalSchema = z.preprocess(
  withDefaultForm,
  z
    .discriminatedUnion('form', [entrepreneurLegalSchema, companyLegalSchema], {
      errorMap: () => ({ message: 'Форма регистрации — ИП или ООО' }),
    })
    .superRefine(checkAccounts),
);

/** Ставки калькулятора живут в домене цен — там же, где формула. */
export const extrasSchema = installRatesSchema;

/**
 * 🔴 Здесь живут **сроки**, а не условия договора: «1 год», «от 1 до 5 лет».
 *
 * Так их и показывают оба блока — строкой определения под подписью «На
 * монтаж» и «На оборудование». Поле было длинным текстом, и владелец честно
 * писал в него абзац: карточка «Гарантия по договору» раздувалась на пол-экрана
 * и ломала ряд соседних (ADR-125). Что именно покрывает гарантия, объясняет
 * ответ в «Частых вопросах» — там для этого есть место.
 */
export const warrantySchema = z
  .object({
    installation: optionalText,
    equipment: optionalText,
  })
  .strict();

/**
 * Рабочее окно компании: с какого и по какой час календарь открывается по
 * умолчанию.
 *
 * 🔴 Структурой, а не строкой. Свободный текст часов работы
 * (`contacts.hours`, «Пн–Пт 9:00–19:00») для этого не годится: разбирать
 * строку, которую человек пишет как хочет, — способ однажды показать пустой
 * день (ADR-128). Эта настройка живёт рядом, но отвечает на другой вопрос:
 * `contacts.hours` читает посетитель сайта, `schedule` — сетка календаря.
 *
 * Окно ограничивает то, что показано по умолчанию, но не то, что можно
 * завести: монтажник, оставшийся на объекте до девяти вечера, отмечается
 * обычной записью, а время за границей окна помечается переработкой.
 */
export const scheduleSchema = z
  .object({
    /** Минуты от полуночи по Москве. Полночь — ноль, девять утра — 540. */
    fromMin: z.coerce
      .number()
      .int()
      .min(0)
      .max(1439)
      .default(9 * 60),
    /* Потолок — 23:59, а не полночь: окно показывается временем суток
       (`timeOfMinutes` в календаре прижимает как раз к 1439), и разрешённые
       здесь 1440 доезжали до панели как «23:59» — настройка, которая не
       сохраняет то, что в неё ввели. */
    toMin: z.coerce
      .number()
      .int()
      .min(1)
      .max(1439)
      .default(19 * 60),
  })
  .strict()
  .refine((value) => value.fromMin < value.toMin, {
    path: ['toMin'],
    message: 'Конец рабочего дня должен быть позже начала',
  });

export const paymentSchema = z
  .object({
    methods: z.array(z.string().trim().max(300)).max(20).default([]),
    vat: optionalText,
  })
  .strict();

export const socialSchema = z
  .object({
    links: z.array(optionalUrl).max(20).default([]),
  })
  .strict();

export const seoSchema = z
  .object({
    homeTitle: optionalText,
    homeDescription: optionalLongText,
    titleSuffix: optionalText,
    ogImage: optionalText,
  })
  .strict();

/**
 * Полоса цифр первого экрана: «1200+ установок в Туле», «3 года гарантия»,
 * «1 день от заявки до запуска» (макет, «HERO»).
 *
 * 🔴 Цифры хранятся здесь, а не в коде: это утверждения о компании, и
 * отвечает за них владелец (инвариант 8). Пустой список — рабочее состояние:
 * полосы просто нет. Придумать «1200 установок» за владельца нельзя —
 * выдуманный счётчик выполненных работ прямо запрещён (инвариант 10).
 */
export const achievementsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            /**
             * Что видит посетитель на месте числа: «1200», «3», «1–5», «до 5».
             *
             * 🔴 Строка, а не число: гарантия на технику зависит от модели и
             * честно записывается диапазоном, а «5 лет» вместо «1–5 лет» —
             * это уже обещание, которого компания не давала (инвариант 10).
             * Счётчик отсчитывает то, что отсчитывается, остальное показывает
             * как есть (ADR-071).
             *
             * Хотя бы одна цифра обязательна: полоса называется «цифры», и
             * слово без числа в ней — это подпись без утверждения.
             */
            value: z.coerce
              .string()
              .trim()
              .min(1, { message: 'Укажите число' })
              .max(12, { message: 'Слишком длинное значение' })
              .refine((text) => /\d/.test(text), { message: 'В значении должна быть цифра' }),
            /** Хвост после числа: «+», « года», « день» — склонение за владельцем. */
            suffix: z.string().trim().max(20).default(''),
            label: z.string().trim().max(120),
          })
          .strict(),
      )
      .max(4)
      .default([]),
  })
  .strict();

/**
 * Справочник характеристик товара: группы и типовые поля.
 *
 * 🔴 Это подсказка и порядок, а не список допустимых характеристик
 * (инвариант 6, ADR-094). Владелец по-прежнему заводит у модели любую пару
 * «название → значение»; характеристика, которой в справочнике нет, работает
 * как прежде и показывается в группе «Прочее».
 *
 * Справочник решает три задачи: подсказывает названия в редакторе модели,
 * группирует характеристики в карточке товара и задаёт порядок строк в
 * таблице сравнения — иначе он определяется тем, в каком порядке владелец
 * заполнял первую попавшуюся модель.
 */
export const specsSchema = z
  .object({
    groups: z
      .array(
        z
          .object({
            title: z
              .string()
              .trim()
              .min(1, { message: 'У группы должно быть название' })
              .max(80, { message: 'Не длиннее 80 символов' }),
            fields: z
              .array(
                z
                  .object({
                    /** Название характеристики — оно же ключ пары у модели. */
                    k: z
                      .string()
                      .trim()
                      .min(1, { message: 'У характеристики должно быть название' })
                      .max(120, { message: 'Не длиннее 120 символов' }),
                    /**
                     * Единица измерения — подсказка при заполнении, а не часть
                     * значения: «21» и «дБ» отдельно превратились бы в две
                     * строки таблицы сравнения, если бы владелец у одной модели
                     * написал «21 дБ», а у другой «21».
                     */
                    unit: z.string().trim().max(24).default(''),
                    hint: z.string().trim().max(200).default(''),
                  })
                  .strict(),
              )
              .max(40)
              .default([]),
          })
          .strict(),
      )
      .max(20)
      .default([]),
  })
  .strict();

/**
 * Куда уходят уведомления о заявках, отзывах и напоминаниях.
 *
 * 🔴 В базе живёт только выбор и адресация — какие каналы включены, в какой
 * чат и на какую почту. Токен бота и пароль SMTP остаются в переменных
 * окружения (инвариант 3): владелец распоряжается адресатами, доступами —
 * тот, кто держит сервер.
 *
 * 🔴 Запись обращения в базу не выключается ничем: заявка сначала попадает в
 * админку и только потом уходит в каналы (инвариант 2). Здесь настраивается
 * то, что происходит после записи, а не вместо неё.
 */
export const notificationsSchema = z
  .object({
    telegram: z.boolean().default(true),
    email: z.boolean().default(true),
    /**
     * Чат или канал, куда пишет бот. Пусто — берётся значение из окружения.
     *
     * 🔴 Формат проверяется здесь, а не выясняется по молчанию канала:
     * опечатка в идентификаторе выглядит ровно как неработающий Telegram, и
     * владелец полдня ищет проблему на сервере. Числовой id (у групп он
     * отрицательный, у супергрупп начинается с `-100`) или `@имя_канала`.
     */
    telegramChatId: z
      .union(
        [
          z.literal(''),
          z
            .string()
            .trim()
            .regex(/^(-?\d{5,20}|@[A-Za-z][\w]{4,31})$/),
        ],
        {
          errorMap: () => ({ message: 'Ожидается числовой id чата или @имя канала' }),
        },
      )
      .default(''),
    /** Кому уходят письма. Пусто — берётся значение из окружения. */
    emailTo: z.union([z.literal(''), z.string().trim().email('Проверьте адрес почты')]).default(''),
  })
  .strict();

/**
 * Клиентские сервисы. Онлайн-чат сознательно не подключается: общение идёт
 * через Telegram по желанию клиента и через заявку (ADR-024).
 */
export const integrationsSchema = z
  .object({
    metrikaId: optionalText,
    messengerButtons: z
      .object({ telegram: z.boolean().default(false), whatsapp: z.boolean().default(false) })
      .strict()
      .default({ telegram: false, whatsapp: false }),
    callback: z
      .object({ enabled: z.boolean().default(true) })
      .strict()
      .default({ enabled: true }),
  })
  .strict();

/** Реестр: `PUT /api/admin/settings/{key}` валидирует тело схемой своего ключа. */
export const settingSchemas = {
  company: companySchema,
  contacts: contactsSchema,
  address: addressSchema,
  geo: geoSchema,
  area: areaSchema,
  legal: legalSchema,
  extras: extrasSchema,
  warranty: warrantySchema,
  schedule: scheduleSchema,
  payment: paymentSchema,
  social: socialSchema,
  seo: seoSchema,
  achievements: achievementsSchema,
  specs: specsSchema,
  notifications: notificationsSchema,
  integrations: integrationsSchema,
} as const;

export const settingKeySchema = z.enum([
  'company',
  'contacts',
  'address',
  'geo',
  'area',
  'legal',
  'extras',
  'warranty',
  'schedule',
  'payment',
  'social',
  'seo',
  'achievements',
  'specs',
  'notifications',
  'integrations',
]);

export type SettingKey = z.infer<typeof settingKeySchema>;

export type Settings = {
  readonly [K in SettingKey]: z.infer<(typeof settingSchemas)[K]>;
};

export type Company = Settings['company'];
export type Contacts = Settings['contacts'];
export type Address = Settings['address'];
export type Geo = Settings['geo'];
export type ServiceArea = Settings['area'];
export type Legal = Settings['legal'];

/**
 * Ветви реквизитов по форме регистрации. Нужны там, где значение заведомо
 * одной формы: фикстуры, истории и описание полей. В рабочем коде тип
 * сужается проверкой `legal.form`, а не приведением.
 */
export type LegalEntrepreneur = Extract<Legal, { form: 'ИП' }>;
export type LegalCompany = Extract<Legal, { form: 'ООО' }>;
export type Warranty = Settings['warranty'];
export type Payment = Settings['payment'];
export type Social = Settings['social'];
export type Seo = Settings['seo'];
export type Integrations = Settings['integrations'];
