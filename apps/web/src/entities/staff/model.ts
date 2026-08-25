import { z } from 'zod';

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

/** Пустое необязательное поле формы приходит пустой строкой — это «не заполнено». */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Не длиннее ${max} символов` })
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .default(null);

/** Заведение монтажника владельцем: временный пароль он меняет сам в профиле. */
export const staffCreateSchema = z.object({
  name: nameSchema,
  login: loginSchema,
  phone: optionalText(40),
  password: passwordSchema,
});

export type StaffCreate = z.infer<typeof staffCreateSchema>;

/**
 * Правка карточки монтажника владельцем.
 *
 * Роль здесь не меняется: превращение монтажника во владельца — это выдача
 * доступа ко всем деньгам компании, и делаться такое должно осознанно, а не
 * соседним `select` в форме правки телефона.
 */
export const staffUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    login: loginSchema.optional(),
    phone: optionalText(40).optional(),
    password: passwordSchema.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Нечего сохранять');

export type StaffUpdate = z.infer<typeof staffUpdateSchema>;

/** Свой профиль: имя и телефон. Логин и роль себе не меняют. */
export const profileUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    phone: optionalText(40).optional(),
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
  readonly active: boolean;
  readonly createdAt: string;
  readonly lastLoginAt: string | null;
};

/** Как показывать человека, у которого имя ещё не заполнено. */
export function staffTitle(staff: Pick<StaffCard, 'name' | 'login'>): string {
  return staff.name ?? staff.login;
}
