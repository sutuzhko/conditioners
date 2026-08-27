import {
  leadContextModelText,
  leadContextParamsText,
  leadContextPickText,
} from '@/entities/lead/lib/context';
import type { LeadContext, LeadContextModel } from '@/entities/lead/model';
import { formatMoney } from '@/shared/lib/format';

import { leadManagerContent as texts } from './content';
import styles from './LeadContextView.module.css';

export interface LeadContextViewProps {
  readonly context: LeadContext;
  /** Заголовок блока: в карточке уже есть `h2` с именем клиента (инвариант 4). */
  readonly headingId: string;
}

/**
 * Контекст заявки в карточке: расчёт, подбор и модели — читаемо, а не дампом.
 *
 * 🔴 Смысл раздела в том, чтобы менеджер начал разговор с того места, на
 * котором человек остановился. Поэтому разбивка сметы показана целиком, а не
 * одной суммой: клиент спросит «а почему шесть тысяч», и ответ должен быть на
 * экране, а не в голове.
 */
export function LeadContextView({ context, headingId }: LeadContextViewProps) {
  const { estimate, pick, model, liked } = context;

  return (
    <section className={styles.context} aria-labelledby={headingId}>
      <h3 className={styles.title} id={headingId}>
        {texts.contextTitle}
      </h3>
      <p className={styles.hint}>{texts.contextHint}</p>

      {estimate === null ? null : (
        <div className={styles.block}>
          <p className={styles.blockTitle}>{texts.contextEstimate}</p>
          {estimate.params.length === 0 ? null : (
            <p className={styles.params}>{leadContextParamsText(estimate.params)}</p>
          )}

          <dl className={styles.lines}>
            {estimate.lines.map((line) => (
              <div className={styles.line} key={line.label}>
                <dt className={styles.lineLabel}>{line.label}</dt>
                <dd className={styles.lineAmount}>{formatMoney(line.amount)}</dd>
              </div>
            ))}

            {/* цена за один блок имеет смысл только там, где блоков больше одного */}
            {estimate.perUnit === null ? null : (
              <div className={styles.line}>
                <dt className={styles.lineLabel}>{texts.contextPerUnit(estimate.qty)}</dt>
                <dd className={styles.lineAmount}>{formatMoney(estimate.perUnit)}</dd>
              </div>
            )}

            <div className={`${styles.line} ${styles.total}`}>
              <dt className={styles.lineLabel}>{texts.contextTotal}</dt>
              <dd className={styles.lineAmount}>{formatMoney(estimate.total)}</dd>
            </div>
          </dl>
        </div>
      )}

      {pick === null ? null : (
        <div className={styles.block}>
          <p className={styles.blockTitle}>{texts.contextPick}</p>
          <p className={styles.params}>
            {pick.model === null
              ? leadContextPickText(pick)
              : `${leadContextPickText(pick)} → ${leadContextModelText(pick.model)}`}
          </p>
        </div>
      )}

      {model === null ? null : <ModelBlock title={texts.contextModel} models={[model]} />}

      {liked.length === 0 ? null : <ModelBlock title={texts.contextLiked} models={liked} />}
    </section>
  );
}

type ModelBlockProps = {
  readonly title: string;
  readonly models: readonly LeadContextModel[];
};

/** Список моделей: названием и ценой, которую видел человек, а не слагом. */
function ModelBlock({ title, models }: ModelBlockProps) {
  return (
    <div className={styles.block}>
      <p className={styles.blockTitle}>{title}</p>
      <ul className={styles.models}>
        {models.map((item) => (
          <li className={styles.model} key={item.slug}>
            {leadContextModelText(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}
