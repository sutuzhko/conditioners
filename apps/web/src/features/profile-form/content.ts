/** Подписи раздела профиля. */
import type { AdminRole } from '@/entities/staff/model';
import { employmentTitle, type Employment } from '@/shared/lib/employment';

const ROLE_TITLES: Record<AdminRole, string> = {
  owner: 'владелец',
  installer: 'монтажник',
};

export const profileFormContent = {
  title: 'Профиль',
  lead: 'Личные данные и пароль. Логин меняет владелец — его печатают на бумажке и диктуют по телефону.',

  personalTitle: 'Личные данные',
  name: 'Имя',
  login: 'Логин',
  phone: 'Телефон',

  employment: 'Оформление',
  /* Только на чтение: оформление — условие расчётов по нарядам, а не личная
     настройка, и заводит его владелец (CRM.md §9). */
  employmentHint: 'Оформление заводит владелец: от него зависит расчёт по нарядам.',
  employmentValue: (employment: Employment | null): string =>
    employment === null ? 'Не заведено' : employmentTitle(employment),
  save: 'Сохранить',
  saving: 'Сохраняем…',
  saved: 'Сохранено',

  passwordTitle: 'Смена пароля',
  passwordHint:
    'После смены все остальные открытые сессии закрываются — на чужом компьютере войти по старому паролю не получится.',
  passwordCurrent: 'Текущий пароль',
  passwordNext: 'Новый пароль',
  passwordSubmit: 'Сменить пароль',
  passwordSending: 'Меняем…',
  passwordDone: 'Пароль изменён',

  exitTitle: 'Вход в панель',
  exitHint:
    'Выход закрывает сессию на этом устройстве. Забытый пароль восстанавливает владелец из раздела «Монтажники»: восстановления по почте у панели нет.',
  exit: 'Выйти',

  themeTitle: 'Тема интерфейса',
  themeHint: 'Выбор запоминается в этом браузере и на сайт не влияет.',

  roleTitle: (role: AdminRole): string => ROLE_TITLES[role],

  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',
  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',
} as const;
