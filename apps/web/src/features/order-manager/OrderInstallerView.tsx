import type { OrderCard, OrderUnitCard } from '@/entities/order/model';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import { Badge, Card, Icon, buttonClassName } from '@/shared/ui';

import { EQUIP_TITLE, orderManagerContent as texts } from './content';
import { installerContent as own } from './installer-content';
import { routeHref } from './installer-model';
import { OrderInstallerActions } from './OrderInstallerActions';
import type { OrderApi } from './model';
import styles from './OrderInstallerView.module.css';

export interface OrderInstallerViewProps {
  readonly order: OrderCard;
  /** Набор запросов действия. Подменяется в историях и тестах. */
  readonly api?: OrderApi | undefined;
  /** Страницу обновляют снаружи: карточка не знает, откуда её открыли. */
  readonly onChanged?: (() => void) | undefined;
}

/** Плашки позиции: чьё оборудование, сколько трассы, какой диаметр, штроба. */
function unitMarks(unit: OrderUnitCard): readonly { key: string; text: string }[] {
  const marks = [{ key: 'source', text: own.sourceMark(unit.source) }];

  if (unit.trassaM !== null) marks.push({ key: 'trassa', text: own.trassaMark(unit.trassaM) });
  if (unit.diameter !== null) marks.push({ key: 'diameter', text: unit.diameter });
  if (unit.shtrob) marks.push({ key: 'shtrob', text: own.shtrobUnitMark });

  return marks;
}

/**
 * Наряд глазами монтажника — второй кадр `design/admin/Installer.body.html`,
 * issue #619.
 *
 * 🔴 Заметки владельца и удержания здесь нет вовсе — и это не про скрытые
 * кнопки: сервер не кладёт эти ключи в его ответ (docs/API.md §13), а
 * компонент их не читает. Сумма заказа показывается только при оплате
 * наличными: в остальных случаях её монтажнику знать незачем, и приходить она
 * тоже не должна.
 *
 * 🔴 Данные — на чтение. Правка наряда монтажнику закрыта; единственное, чем
 * он управляет, — переход статуса, и он вынесен в липкую полосу внизу.
 *
 * Серверный компонент: интерактивна только полоса действия. Порядок блоков —
 * порядок работы на объекте: доехать, найти квартиру, посмотреть, что ставим,
 * прочитать предупреждения, сдать.
 */
export function OrderInstallerView({ order, api, onChanged }: OrderInstallerViewProps) {
  const cash = order.payment === 'cash_to_installer' && order.price !== undefined;

  return (
    <div className={styles.view}>
      <Card as="section" className={styles.block} aria-labelledby="installer-object">
        <h2 className={styles.blockTitle} id="installer-object">
          {own.objectTitle}
        </h2>

        <p className={styles.address}>{order.address}</p>

        <dl className={styles.facts}>
          {/* Кого спрашивать у двери. Номер рядом с именем — его диктуют
              вслух; кнопка «Позвонить» ниже нужна для другого, для нажатия. */}
          <div className={styles.fact}>
            <dt>{texts.client}</dt>
            <dd>
              {order.client.name}{' '}
              <a className={styles.phone} href={phoneHref(order.client.phone)}>
                {formatPhone(order.client.phone)}
              </a>
            </dd>
          </div>

          {order.intercom === null ? null : (
            <div className={styles.fact}>
              <dt>{own.intercom}</dt>
              <dd className={styles.factValue}>{order.intercom}</dd>
            </div>
          )}

          {order.floor === null ? null : (
            <div className={styles.fact}>
              <dt>{own.floor}</dt>
              <dd className={styles.factValue}>{order.floor}</dd>
            </div>
          )}

          {order.phone2 === null ? null : (
            <div className={styles.fact}>
              <dt>{own.phone2}</dt>
              <dd>
                <a className={styles.phone} href={phoneHref(order.phone2)}>
                  {formatPhone(order.phone2)}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {/* Маршрут и звонок — ссылки наружу: `tel:` и карты не маршруты
            приложения, и типизированный Link им не нужен. */}
        <div className={styles.actions}>
          <a
            className={`${buttonClassName({ variant: 'flat', size: 'lg', fullWidth: true })} ${styles.action}`}
            href={routeHref(order.address)}
            target="_blank"
            rel="noreferrer"
            aria-label={own.routeLabel(order.address)}
          >
            {own.route}
          </a>
          <a
            className={`${buttonClassName({ variant: 'flat', size: 'lg', fullWidth: true })} ${styles.action}`}
            href={phoneHref(order.client.phone)}
            aria-label={own.callLabel(order.client.name)}
            title={formatPhone(order.client.phone)}
          >
            {own.callOnSite}
          </a>
        </div>
      </Card>

      <Card as="section" className={styles.block} aria-labelledby="installer-units">
        <div className={styles.blockHead}>
          <h2 className={styles.blockTitle} id="installer-units">
            {own.unitsTitle}
          </h2>
          {order.units.length === 0 ? null : (
            <Badge variant="neutral" size="sm">
              {own.unitsMark(order.units.length)}
            </Badge>
          )}
        </div>

        {order.units.length === 0 ? (
          <p className={styles.quiet}>{own.unitsEmpty}</p>
        ) : (
          <ul className={styles.units}>
            {order.units.map((unit) => (
              <li className={styles.unit} key={unit.id}>
                <span className={styles.unitModel}>{unit.model ?? EQUIP_TITLE[unit.equip]}</span>
                <span className={styles.unitMarks}>
                  {unitMarks(unit).map((mark) => (
                    <Badge
                      key={mark.key}
                      size="sm"
                      variant={mark.key === 'shtrob' ? 'warning' : 'neutral'}
                    >
                      {mark.text}
                    </Badge>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Предупреждения — то, к чему готовятся до звонка в дверь: собака,
          домофон, страховка. Отдельной карточкой, а не строчкой в фактах:
          на телефоне их пролистывают вместе с адресом. */}
      {order.comment === null && !order.heightWorks ? null : (
        <Card
          as="section"
          variant="accent"
          className={styles.note}
          aria-labelledby="installer-note"
        >
          <h2 className={styles.noteTitle} id="installer-note">
            <Icon name="danger" size={18} />
            {own.noteTitle}
          </h2>

          {order.heightWorks ? <p className={styles.noteText}>{own.heightWorksNote}</p> : null}
          {order.comment === null ? null : <p className={styles.noteText}>{order.comment}</p>}
        </Card>
      )}

      <Card as="section" className={styles.block} aria-labelledby="installer-money">
        <h2 className={styles.blockTitle} id="installer-money">
          {texts.moneyTitle}
        </h2>

        <dl className={styles.facts}>
          {/* 🔴 Выплата приходит всегда: это его деньги. */}
          <div className={styles.fact}>
            <dt>{texts.installerFee}</dt>
            <dd className={styles.money}>{texts.money(order.installerFee)}</dd>
          </div>

          {/* 🔴 Сумма заказа — только при оплате наличными: её нужно принять
              от клиента на объекте. В остальных случаях ключа нет вовсе. */}
          {cash && order.price !== undefined ? (
            <div className={styles.fact}>
              <dt>{texts.cashToTake}</dt>
              <dd className={styles.money}>{texts.money(order.price)}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <OrderInstallerActions
        orderId={order.id}
        status={order.status}
        api={api}
        onChanged={onChanged}
      />
    </div>
  );
}
