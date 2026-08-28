import type { Legal, LegalForm } from '@/entities/settings/model';
import { formatDate } from '@/shared/lib/format';

/**
 * Наименование с формой собственности: «ИП Иванов Иван Иванович», «ООО «Пример»».
 *
 * 🔴 Одна строка на проект. Её печатает футер и её же получает `legalName` в
 * разметке `Organization`: раньше это были два независимых поля настроек, и
 * разойтись они успели уже в дев-данных — прямое нарушение инварианта 9
 * (числа и факты в JSON-LD совпадают с видимым текстом). См. ADR-106.
 *
 * Форма хранится отдельным полем, но владелец легко впишет её и в
 * наименование — тогда получилось бы «ИП ИП Иванов». Поэтому префикс
 * добавляется, только если его там ещё нет.
 */
function withForm(form: LegalForm, rawName: string): string {
  const name = rawName.trim();
  if (name === '') return form;

  return name.toLowerCase().startsWith(form.toLowerCase()) ? name : `${form} ${name}`;
}

/**
 * Полное наименование: ФИО предпринимателя или фирменное наименование общества.
 *
 * Им подписан оператор персональных данных в политике и `legalName` в
 * разметке: это документные сведения, и сокращать их там нельзя.
 */
export function legalTitle(legal: Legal): string {
  return withForm(legal.form, legal.name);
}

/**
 * Наименование для витрины: у общества — сокращённое, если владелец его
 * завёл. «ООО «Пример»» в футере читается, полное фирменное наименование
 * в три строки — нет. У предпринимателя сокращённого не бывает вовсе.
 */
export function legalShortTitle(legal: Legal): string {
  if (legal.form === 'ООО' && legal.shortName.trim() !== '') {
    return withForm(legal.form, legal.shortName);
  }

  return legalTitle(legal);
}

export type Requisite = {
  readonly key: string;
  readonly label: string;
  readonly value: string;
};

/**
 * Что из реквизитов обязано быть на сайте — PROJECT §5.3, ЗоЗПП ст. 9 и
 * Правила продажи (ПП РФ № 2463).
 *
 * 🔴 Одна дверь для футера и для политики обработки персональных данных.
 * Оператор ПДн в политике не имеет права отличаться от продавца в футере:
 * это одно лицо, и расхождение — готовый вопрос от проверяющего. Два списка
 * рядом разошлись бы на первой же правке, как разошлись когда-то три словаря
 * единиц измерения.
 *
 * 🔴 Адреса регистрации предпринимателя здесь нет и быть не может: это, как
 * правило, домашний адрес, то есть персональные данные (PROJECT §5.1).
 * Посетителю показывается фактический адрес приёма из группы `address`.
 * Хранится он для документов — и не публикуется именно тем, что эта функция
 * его не отдаёт.
 *
 * КПП, руководителя и банковские реквизиты витрина тоже не получает: они
 * нужны счетам и договорам.
 */
export function publicRequisites(legal: Legal): readonly Requisite[] {
  const rows: readonly Requisite[] =
    legal.form === 'ИП'
      ? [
          { key: 'inn', label: 'ИНН', value: legal.inn },
          { key: 'ogrn', label: 'ОГРНИП', value: legal.ogrn },
          /* Дата хранится машинной (`2015-03-12`), а читают её люди: в
             реквизитах она стоит рядом с органом регистрации. */
          { key: 'regDate', label: 'Дата регистрации', value: formatDate(legal.regDate) },
          { key: 'regAuthority', label: 'Орган регистрации', value: legal.regAuthority },
        ]
      : [
          { key: 'inn', label: 'ИНН', value: legal.inn },
          { key: 'ogrn', label: 'ОГРН', value: legal.ogrn },
          { key: 'address', label: 'Юридический адрес', value: legal.address },
        ];

  return rows.filter((row) => row.value.trim() !== '');
}

/**
 * Реквизиты в том виде, в каком их можно отдать наружу.
 *
 * 🔴 Существует потому, что у группы `legal` **две двери**: страницы сайта и
 * публичный маршрут `GET /api/settings/legal`. Пока дверей было две, а
 * распорядитель публикации один, маршрут отдавал всё подряд — включая адрес
 * регистрации предпринимателя (домашний, то есть персональные данные) и
 * банковские реквизиты. Проверять запрет глазами при каждой правке нельзя:
 * теперь наружу уходит то, что собрала эта функция, и ничего сверх.
 *
 * Форма остаётся: по ней потребитель понимает, чьи это реквизиты, — но она
 * не факт о человеке, а признак записи.
 */
export type PublicLegal = {
  readonly form: LegalForm;
  readonly title: string;
  readonly requisites: readonly Requisite[];
};

export function publicLegal(legal: Legal): PublicLegal {
  return {
    form: legal.form,
    title: legalShortTitle(legal),
    requisites: publicRequisites(legal),
  };
}
