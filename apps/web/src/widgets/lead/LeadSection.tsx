import { Suspense } from 'react';

import {
  LeadForm,
  LeadSubjectSync,
  type LeadModelOption,
  type LeadTopic,
} from '@/features/lead-form';
import { Icon, type ButtonLinkHref } from '@/shared/ui';

import { leadSectionContent as t } from './content';
import styles from './LeadSection.module.css';

const HEADING_ID = 'lead-title';

export interface LeadSectionProps {
  /**
   * 🔴 Запасной путь формы: если отправка не удалась, человек не должен
   * остаться ни с чем. Телефон приходит из настроек компании, в коде его нет
   * (инвариант 8). Пустая строка — рабочее состояние: владелец мог не заполнить
   * настройки, и форма тогда просто не показывает запасной телефон.
   */
  phone: string;
  /**
   * Адрес политики обработки персональных данных — уходит в форму. Пропсом,
   * а не литералом: `typedRoutes` не соберёт ссылку на несуществующий маршрут.
   */
  policyHref: ButtonLinkHref;
  /**
   * Обещанное время ответа — «15 минут». 🔴 Это измеримое обещание, то есть
   * факт о компании: он приходит из настроек, а не из вёрстки (инвариант 8).
   * Пока настройки нет — пропс не передают, и секция обещания не даёт.
   */
  responseTime?: string | undefined;
  /** Тема обращения, выбранная заранее: на странице ремонта — «Сервис и ремонт». */
  defaultTopic?: LeadTopic | undefined;
  /**
   * Видимые модели каталога: слаг → название. Кнопки у моделей ведут на
   * `/?model=<слаг>&topic=install#lead`, и по этому списку форма подставляет
   * в поле «Модель» название, а не слаг (ADR-129). Пустой список — рабочее
   * состояние: каталог пуст, подставлять нечего.
   */
  models: readonly LeadModelOption[];
  /** Якорь секции: на него ведут кнопки заявки со всей страницы. */
  id?: string | undefined;
}

/**
 * Секция заявки: слева — что будет после отправки, справа — сама форма.
 *
 * Серверный компонент: левая колонка приходит в HTML готовой и индексируется
 * без JavaScript (инвариант 1). `'use client'` стоит только на самой форме —
 * интерактивна она, а не секция.
 */
export function LeadSection({
  phone,
  policyHref,
  responseTime,
  defaultTopic,
  models,
  id = 'lead',
}: LeadSectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID} data-band>
      <div className={styles.container}>
        {/* 🔴 Грунт стоит только на тёмной части секции, а не на секции целиком
            (ADR-158, issue #276). Белая карточка формы его не наследует:
            иначе подписи полей получают цвета тёмной темы на белом фоне и
            контраст падает до 1,6:1 при норме 4,5:1. */}
        <div className={styles.intro} data-ground="panel">
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h2>
          <p className={styles.lead}>
            {t.description}
            {responseTime === undefined ? null : ` ${t.responseNote(responseTime)}`}
          </p>

          <ul className={styles.benefits} aria-label={t.benefitsLabel}>
            {t.benefits.map((benefit) => (
              <li key={benefit} className={styles.benefit}>
                <span className={styles.mark}>
                  <Icon name="check" size={18} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.form}>
          {/* 🔴 Предмет обращения приезжает в адресе (`?model=`, `?topic=`), но
              читает его отдельный клиентский лист внутри `<Suspense>`, а не
              страница. Главная статическая с `revalidate = 3600`: прочитай
              `searchParams` сама страница — Next перевёл бы её в динамический
              рендер, и она ходила бы в базу на каждый запрос, потеряв
              пререндер и бюджет LCP. Граница ограничивает клиентский рендер
              этим листом: форма остаётся в серверном HTML (инвариант 1).
              Показывать на время границы нечего — лист ничего не рисует. */}
          <Suspense fallback={null}>
            <LeadSubjectSync />
          </Suspense>
          <LeadForm
            phone={phone}
            policyHref={policyHref}
            models={models}
            {...(defaultTopic === undefined ? {} : { defaultTopic })}
          />
        </div>
      </div>
    </section>
  );
}
