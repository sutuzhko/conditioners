import type { Contacts } from '@/entities/settings/model';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import { ButtonLink, Icon, buttonClassName } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { actionBarContent as t } from './content';
import type { CompareOffer } from './model';
import styles from './ActionBar.module.css';

export interface ActionBarViewProps {
  /** Контакты из настроек: телефон в коде не живёт (инвариант 8). */
  readonly contacts: Contacts;
  /** Куда ведёт призыв. Форма заявки — на главной, поэтому адрес абсолютный. */
  readonly leadHref: ButtonLinkHref;
  /** Есть отметки сравнения — вторая кнопка меняет предмет. */
  readonly compare?: CompareOffer | undefined;
}

/**
 * Сама панель — без правил появления.
 *
 * 🔴 Отделена от `ActionBar` не ради слоёв, а ради проверки: панель видна
 * только после двух условий по прокрутке, и в Storybook её иначе не показать
 * — а компонент, которого нельзя увидеть в истории, не проходит ревью
 * (docs/CLAUDE.md, «Тестирование»).
 *
 * Порядок кнопок повторяет вес действия: звонок — запасной путь, заявка —
 * цель страницы, поэтому она шире (`flex: 1.4` против `1`).
 */
export function ActionBarView({ contacts, leadHref, compare }: ActionBarViewProps) {
  const rawPhone = contacts.phones[0];
  const phone =
    rawPhone === undefined || rawPhone.trim() === ''
      ? undefined
      : { text: formatPhone(rawPhone), href: phoneHref(rawPhone) };

  return (
    <nav className={styles.bar} aria-label={t.label}>
      {phone === undefined ? null : (
        <a
          href={phone.href}
          className={[buttonClassName({ variant: 'secondary', size: 'md' }), styles.action].join(
            ' ',
          )}
          aria-label={t.callAria(phone.text)}
        >
          {/* Значок рядом с подписью — украшение: имя кнопке даёт aria-label */}
          <Icon name="phone" size={17} />
          {t.call}
        </a>
      )}

      {compare === undefined ? (
        <ButtonLink href={leadHref} size="md" className={[styles.action, styles.lead].join(' ')}>
          {t.lead}
        </ButtonLink>
      ) : (
        <ButtonLink
          href={compare.href}
          size="md"
          className={[styles.action, styles.lead].join(' ')}
          aria-label={t.compareAria(compare.count)}
          iconEnd={<span className={styles.count}>{compare.count}</span>}
        >
          {t.compare}
        </ButtonLink>
      )}
    </nav>
  );
}
