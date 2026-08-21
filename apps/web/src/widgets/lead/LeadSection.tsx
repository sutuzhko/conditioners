import { LeadForm, type LeadTopic } from '@/features/lead-form';
import { CheckIcon, type ButtonLinkHref } from '@/shared/ui';

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
  id = 'lead',
}: LeadSectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <div className={styles.intro}>
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
                  <CheckIcon size={18} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.form}>
          <LeadForm
            phone={phone}
            policyHref={policyHref}
            {...(defaultTopic === undefined ? {} : { defaultTopic })}
          />
        </div>
      </div>
    </section>
  );
}
