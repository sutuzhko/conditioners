import { z } from 'zod';

import { EMPLOYMENTS, type Employment } from '@/shared/lib/employment';
import { isInnPerson } from '@/shared/lib/requisites';
import { optionalPhoneField } from '@/shared/lib/zod';

/**
 * Люди, которые заходят в панель.
 *
 * Ролей две, и обе — учётные записи с логином и паролем (ADR-092): монтажник
 * открывает ту же панель, просто видит из неё три раздела вместо тринадцати.
 * Отдельной сущности «монтажник» рядом с пользователем нет — она дала бы две
 * таблицы людей и вопрос «а если монтажник станет владельцем».
 */
export const adminRoleSchema = z.enum(['owner', 'installer']);

export type AdminRole = z.infer<typeof adminRoleSchema>;

export const ADMIN_ROLES: readonly AdminRole[] = adminRoleSchema.options;

export function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.some((role) => role === value);
}

/**
 * Как оформлены отношения с человеком.
 *
 * Словарь берётся из `shared/lib/employment` — тот же, что читает наряд.
 * Своей копии здесь нет намеренно: от значения зависит, чем является
 * удержание в наряде, и разошедшиеся списки означали бы, что одна и та же
 * запись в двух разделах панели считается по-разному (CRM.md §9).
 */
export const employmentSchema = z.enum(EMPLOYMENTS, {
  errorMap: () => ({ message: 'Выберите оформление из списка' }),
});

/**
 * Оформление в форме: пустое значение `select` — «оформление не заведено».
 *
 * 🔴 Умолчания у поля нет и быть не может. Оформление — условие расчётов:
 * подставив значение за владельца, система решила бы за него, законно ли
 * уменьшать человеку вознаграждение. Пока владелец не выбрал, поле пустое,
 * и наряд исходит из того, что уменьшать нельзя (`deductionReducesFee`).
 */
const optionalEmployment = z
  .union([employmentSchema, z.literal('')])
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .default(null);

/**
 * ИНН монтажника — двенадцать цифр физического лица или предпринимателя.
 *
 * 🔴 Пустое значение проходит. Человека заводят по телефону в тот день, когда
 * он вышел на первый выезд, а ИНН узнают позже; запрет на сохранение без него
 * закрыл бы дорогу самому заведению (PROJECT §5.4).
 *
 * Заполненный проверяется контрольными разрядами, а не длиной строки: у ФНС
 * ИНН с опиской выглядит как «плательщик не найден», и выяснится это в день
 * выплаты, когда проверять статус уже поздно.
 *
 * Пробелы вычищаются — реквизит копируют из документа вместе с ними, и это
 * особенность источника, а не ошибка человека.
 */
const innSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s/g, ''))
  .refine((value) => value === '' || isInnPerson(value), {
    message: 'ИНН — 12 цифр, проверьте номер',
  })
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .default(null);

const LOGIN_REQUIRED = 'Придумайте логин для входа';
const NAME_REQUIRED = 'Укажите имя и фамилию';

/**
 * Логин — только латиница, цифры, точка, дефис и подчёркивание.
 *
 * Ограничение не косметическое: логин печатают на бумажке и диктуют по
 * телефону, а кириллическая раскладка на чужом телефоне — лишний способ не
 * войти. Инвариант 17 про адреса говорит о том же.
 */
export const loginSchema = z
  .string({ required_error: LOGIN_REQUIRED })
  .trim()
  .min(3, { message: 'Логин короче трёх символов не годится' })
  .max(32, { message: 'Логин длиннее 32 символов не поместится' })
  .regex(/^[a-z0-9][a-z0-9._-]*$/, {
    message: 'Логин латиницей: буквы, цифры, точка, дефис и подчёркивание',
  });

/**
 * Восемь символов — нижняя граница, ниже которой пароль перебирается за
 * вечер. Верхняя нужна Argon2id: он считает хеш от всей строки целиком.
 */
export const passwordSchema = z
  .string({ required_error: 'Придумайте пароль' })
  .min(8, { message: 'Пароль короче восьми символов подберут' })
  .max(200, { message: 'Пароль длиннее 200 символов не нужен' });

const nameSchema = z
  .string({ required_error: NAME_REQUIRED })
  .trim()
  .min(2, { message: NAME_REQUIRED })
  .max(120, { message: 'Не длиннее 120 символов' });

/**
 * Телефон человека в команде — по общему правилу проекта (`shared/lib/zod`).
 * По этому номеру владелец звонит из карточки, и «asdf» доезжает до `tel:`.
 */
const phoneSchema = optionalPhoneField(40);

/** Заведение монтажника владельцем: временный пароль он меняет сам в профиле. */
export const staffCreateSchema = z.object({
  name: nameSchema,
  login: loginSchema,
  phone: phoneSchema,
  /* Необязательно: человека заводят по телефону, а договор с ним подписывают
     позже. Заставлять выбирать оформление на этом шаге значит получить
     выбранное наугад. */
  employment: optionalEmployment,
  /* ИНН тоже необязателен и по той же причине: он нужен, чтобы проверять
     статус самозанятого, а до выплаты этот день ещё не настал. */
  inn: innSchema,
  password: passwordSchema,
});

export type StaffCreate = z.infer<typeof staffCreateSchema>;

/**
 * Правка карточки монтажника владельцем.
 *
 * Роль здесь не меняется: превращение монтажника во владельца — это выдача
 * доступа ко всем деньгам компании, и делаться такое должно осознанно, а не
 * соседним `select` в форме правки телефона.
 *
 * Оформление, наоборот, меняется здесь и только здесь: человек переходит с
 * ГПХ в штат, и запись об этом обязана быть у владельца под рукой.
 */
export const staffUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    login: loginSchema.optional(),
    phone: phoneSchema.optional(),
    employment: optionalEmployment.optional(),
    inn: innSchema.optional(),
    password: passwordSchema.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Нечего сохранять');

export type StaffUpdate = z.infer<typeof staffUpdateSchema>;

/**
 * Свой профиль: имя и телефон. Логин, роль и оформление себе не меняют.
 *
 * 🔴 Оформления здесь нет намеренно: это условие расчётов по нарядам, а не
 * личная настройка. Человек, выбирающий себе оформление сам, выбирает, можно
 * ли уменьшать ему вознаграждение, — заводит его владелец в разделе команды.
 */
export const profileUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Нечего сохранять');

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/**
 * Смена своего пароля. Текущий обязателен: сессия могла остаться открытой на
 * чужом компьютере, и смена пароля без него — подарок тому, кто её нашёл.
 */
export const passwordChangeSchema = z
  .object({
    current: z.string({ required_error: 'Введите текущий пароль' }).min(1, {
      message: 'Введите текущий пароль',
    }),
    next: passwordSchema,
  })
  .strict()
  .refine((value) => value.current !== value.next, {
    message: 'Новый пароль совпадает со старым',
    path: ['next'],
  });

export type PasswordChange = z.infer<typeof passwordChangeSchema>;

export const installerNoteSchema = z.object({
  text: z
    .string({ required_error: 'Заметка пустая' })
    .trim()
    .min(1, { message: 'Заметка пустая' })
    .max(2000, { message: 'Не длиннее 2000 символов' }),
});

export type InstallerNoteInput = z.infer<typeof installerNoteSchema>;

/** Заметка владельца о монтажнике. Сам монтажник её не видит. */
export type InstallerNoteCard = {
  readonly id: string;
  readonly text: string;
  readonly createdAt: string;
};

/** Карточка человека в списке команды. Пароля здесь нет ни в каком виде. */
export type StaffCard = {
  readonly id: string;
  readonly login: string;
  readonly name: string | null;
  readonly phone: string | null;
  readonly role: AdminRole;
  /**
   * `null` — оформление не заведено. Это не «ещё одно значение словаря», а
   * отсутствие ответа: наряд в таком случае считает, что уменьшать
   * вознаграждение нельзя (CRM.md §9).
   */
  readonly employment: Employment | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly lastLoginAt: string | null;
};

/**
 * Карточка вместе с ИНН — то, что о человеке видит владелец в «Монтажниках».
 *
 * 🔴 Отдельный тип, а не поле в `StaffCard`. ИНН — персональные данные
 * работника (PROJECT §5.5), и нужен он ровно двум экранам владельца: списку
 * команды и карточке человека. Проекция под роль живёт в слое данных
 * (ADR-114), а типом она держится надёжнее договорённости: календарь,
 * назначение наряда и свой профиль работают со `StaffCard`, и положить в них
 * ИНН просто нечем.
 */
export type StaffDetails = StaffCard & {
  /** `null` — ИНН не заведён. У самозанятого это повод предупредить владельца. */
  readonly inn: string | null;
};

/**
 * Самозанятый, у которого ИНН не заведён.
 *
 * 🔴 Это предупреждение, а не запрет. Статус самозанятого утрачивается при
 * превышении лимита дохода или снятии с учёта, и на дату выплаты он может
 * быть уже не тот; проверяется он по ИНН, то есть без ИНН не проверяется
 * вовсе. Слетевший статус — это НДФЛ и взносы, доначисленные компании
 * (PROJECT §5.4). Но запрещать сохранение нельзя: историю отношений с
 * человеком знает владелец, а не система.
 *
 * Принимает и заведённое значение (`null`), и черновик формы (пустая
 * строка) — предупреждение обязано быть видно ещё до сохранения.
 */
export function isSelfEmployedWithoutInn(
  employment: Employment | null,
  inn: string | null,
): boolean {
  return employment === 'self_employed' && (inn === null || inn.trim() === '');
}

/** Как показывать человека, у которого имя ещё не заполнено. */
export function staffTitle(staff: Pick<StaffCard, 'name' | 'login'>): string {
  return staff.name ?? staff.login;
}
