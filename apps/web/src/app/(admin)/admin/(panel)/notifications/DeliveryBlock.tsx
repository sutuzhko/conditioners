import { DeliveryAddresses, DeliveryLog } from '@/features/delivery-log';
import { bindingCode } from '@/server/notifications/binding';
import { listDeliveryTargets } from '@/server/repo/admin-users';
import { deliverySummary, recentFailures, recentPersonal } from '@/server/repo/notifications';

import styles from './page.module.css';

/**
 * Адреса людей и журнал доставки — второй кусок потока.
 *
 * Порядок прежний: сперва «куда шлём вообще», потом «кому лично», и только
 * потом — что не дошло.
 */
export async function DeliveryBlock() {
  const [summary, failures, entries, team] = await Promise.all([
    deliverySummary(),
    recentFailures(),
    recentPersonal(),
    listDeliveryTargets(),
  ]);

  /* Код привязки считается на сервере при каждом заходе: он живёт получасовое
     окно и хранить его негде — он выводится из секрета и идентификатора. */
  const people = team.map((person) => ({
    id: person.id,
    name: person.name,
    role: person.role,
    active: person.active,
    telegram: person.telegramChatId !== null,
    email: person.email,
    code: bindingCode(person.id),
  }));

  return (
    <div className={styles.block}>
      {/* Наряды уходят по этим адресам и никуда больше. */}
      <DeliveryAddresses people={people} />
      <DeliveryLog summary={summary} failures={failures} entries={entries} />
    </div>
  );
}
