import type { ReactNode } from 'react';

import type { OrderCard } from '@/entities/order/model';
import { cancelReasonTitle } from '@/shared/lib/cancel-reason';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import { Badge, Card } from '@/shared/ui';

import { EQUIP_TITLE, PAYMENT_TITLE, orderManagerContent as texts } from './content';
import { orderUnitMarks } from './installer-content';
import { installerName } from './model';
import styles from './OrderOwnerView.module.css';

export interface OrderOwnerViewProps {
  readonly order: OrderCard;
  /**
   * Итог работ — форма владельца. Приходит готовым узлом со страницы: она
   * клиентская, а сама карточка серверная, и собирать её здесь значило бы
   * утащить в браузер всё чтение вместе с ней.
   */
  readonly result: ReactNode;
}

/**
 * Наряд глазами владельца — чтение в две колонки, макет `Order.png`
 * (issue #598).
 *
 * 🔴 Карточка перестала быть формой. Прежде весь наряд был разложен полями
 * правки на всю высоту экрана: на 390 это 5156px у наряда в работе — тринадцать
 * экранов прокрутки, чтобы посмотреть адрес. Смотрят наряд многократно, правят
 * редко, и род экрана обязан следовать частому действию, а не редкому: правка
 * уехала на свой адрес и зовётся из шапки (ADR-307).
 *
 * 🔴 Всё, что видит только владелец, — сумма, выплата, удержание, заметка —
 * приходит сюда потому, что **сервер положил эти ключи в ответ** (ADR-092,
 * ADR-114). Роль здесь не проверяется и проверяться не должна: карточку
 * монтажника рисует `OrderInstallerView`, и прятать поля условием в разметке
 * значило бы отправить их в браузер и понадеяться на CSS.
 *
 * Правая колонка липкая на широком экране: деньги и исполнитель — то, на что
 * смотрят, читая позиции и объект. Ниже 1200px колонки складываются в одну —
 * липнуть на узком экране нечему, там всё и так идёт подряд.
 *
 * Серверный компонент: ничего интерактивного, кроме телефонов-ссылок.
 */
export function OrderOwnerView({ order, result }: OrderOwnerViewProps) {
  return (
    <div className={styles.view}>
      <div className={styles.main}>
        <Card as="section" className={styles.block} aria-labelledby="order-object">
          <h2 className={styles.blockTitle} id="order-object">
            {texts.objectTitle}
          </h2>

          <p className={styles.address}>
            {order.address === '' ? texts.addressEmpty : order.address}
          </p>

          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>{texts.client}</dt>
              {/* Имя и номер — одна строка, но с явным просветом: пробел
                  разметки даёт здесь 2.9px, и имя склеивается с номером. */}
              <dd className={styles.pair}>
                <span>{order.client.name}</span>
                <a className={styles.phone} href={phoneHref(order.client.phone)}>
                  {formatPhone(order.client.phone)}
                </a>
              </dd>
            </div>

            <div className={styles.fact}>
              <dt>{texts.intercom}</dt>
              <dd className={styles.mono}>{order.intercom ?? texts.intercomEmpty}</dd>
            </div>

            <div className={styles.fact}>
              <dt>{texts.floor}</dt>
              <dd className={styles.mono}>{order.floor ?? texts.intercomEmpty}</dd>
            </div>

            {order.phone2 === null ? null : (
              <div className={styles.fact}>
                <dt>{texts.phone2}</dt>
                <dd>
                  <a className={styles.phone} href={phoneHref(order.phone2)}>
                    {formatPhone(order.phone2)}
                  </a>
                </dd>
              </div>
            )}
          </dl>

          {/* Высотные работы — не строка фактов, а предупреждение: от него
              зависит страховка и состав бригады. */}
          {order.heightWorks ? <p className={styles.warn}>{texts.heightWorksOn}</p> : null}
        </Card>

        <Card as="section" className={styles.block} aria-labelledby="order-units">
          <div className={styles.blockHead}>
            <h2 className={styles.blockTitle} id="order-units">
              {texts.unitsTitle}
            </h2>
            {order.units.length === 0 ? null : (
              <Badge variant="neutral" size="sm">
                {texts.unitsCount(order.units.length)}
              </Badge>
            )}
          </div>

          {order.units.length === 0 ? (
            <p className={styles.quiet}>{texts.unitsEmpty}</p>
          ) : (
            <ul className={styles.units}>
              {order.units.map((unit) => (
                <li className={styles.unit} key={unit.id}>
                  <span className={styles.unitModel}>{unit.model ?? EQUIP_TITLE[unit.equip]}</span>
                  <span className={styles.unitMarks}>
                    {orderUnitMarks(unit).map((mark) => (
                      <Badge key={mark.key} size="sm" variant={mark.variant}>
                        {mark.text}
                      </Badge>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {result}
      </div>

      <div className={styles.side}>
        <Card as="section" className={styles.block} aria-labelledby="order-when">
          <h2 className={styles.blockTitle} id="order-when">
            {texts.whenWhoTitle}
          </h2>

          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>{texts.when}</dt>
              <dd className={styles.mono}>
                <time dateTime={order.at}>
                  {texts.date(order.at)}, {texts.clock(order.at)}
                </time>{' '}
                · {texts.span(order.durationMin)}
              </dd>
            </div>

            <div className={styles.fact}>
              <dt>{texts.installer}</dt>
              <dd>
                {order.installer === null ? texts.installerNone : installerName(order.installer)}
              </dd>
            </div>
          </dl>

          {/* 🔴 Переработка названа фактом, а не доплатой: пойдёт ли она в
              деньги, решается вместе с расчётами с командой (ADR-138). */}
          {order.overtimeMin > 0 ? (
            <p className={styles.warn}>{texts.overtime(order.overtimeMin)}</p>
          ) : null}

          <div className={styles.note}>
            <span className={styles.noteLabel}>{texts.comment}</span>
            <p className={styles.noteText}>{order.comment ?? texts.commentEmpty}</p>
          </div>
        </Card>

        <Card as="section" className={styles.block} aria-labelledby="order-money">
          <h2 className={styles.blockTitle} id="order-money">
            {texts.moneyTitle}
          </h2>

          <dl className={styles.facts}>
            {order.price === undefined ? null : (
              <div className={styles.fact}>
                <dt>{texts.price}</dt>
                <dd className={styles.sum}>{texts.money(order.price)}</dd>
              </div>
            )}

            <div className={styles.fact}>
              <dt>{texts.payment}</dt>
              <dd>{PAYMENT_TITLE[order.payment]}</dd>
            </div>

            <div className={styles.fact}>
              <dt>{texts.installerFee}</dt>
              <dd className={styles.money}>{texts.money(order.installerFee)}</dd>
            </div>

            {/* 🔴 «Удержание», а не «штраф»: штрафов как вида взыскания в ТК РФ
                нет, и что запись означает — зависит от оформления человека
                (CRM.md §9). Основание стоит рядом с суммой: сумма без него
                через полгода не значит ничего. */}
            <div className={styles.fact}>
              <dt>{texts.deduction}</dt>
              <dd className={styles.money}>
                {order.deductionSum === undefined || order.deductionSum === 0
                  ? texts.deductionNone
                  : texts.money(order.deductionSum)}
              </dd>
            </div>
          </dl>

          {order.deductionReason === undefined || order.deductionReason === null ? null : (
            <p className={styles.quiet}>{order.deductionReason}</p>
          )}
        </Card>

        {/* 🔴 Отказ показывается только у отменённого наряда: причина без
            отказа читается как действующая (ADR-310). Макет этого блока не
            рисует — он рисует наряд в работе, — но данные у наряда есть, и
            карточка, которая их не показывает, врёт про состояние работы. */}
        {order.status === 'cancelled' && order.cancelReason !== null ? (
          <Card
            as="section"
            variant="accent"
            className={styles.block}
            aria-labelledby="order-cancel"
          >
            <h2 className={styles.blockTitle} id="order-cancel">
              {texts.cancelTitle}
            </h2>

            <p className={styles.noteText}>{cancelReasonTitle(order.cancelReason)}</p>
            {order.cancelNote === null ? null : <p className={styles.quiet}>{order.cancelNote}</p>}
            {order.cancelledAt === null ? null : (
              <p className={styles.quiet}>{texts.cancelAt(order.cancelledAt)}</p>
            )}
          </Card>
        ) : null}

        {/* 🔴 Заметка владельца приходит только владельцу — сервер не кладёт
            этот ключ в ответ монтажнику (docs/API.md §13). */}
        {order.ownerNote === undefined ? null : (
          <Card as="section" className={styles.block} aria-labelledby="order-owner-note">
            <h2 className={styles.blockTitle} id="order-owner-note">
              {texts.ownerNoteTitle}
            </h2>
            <p className={styles.noteText}>{order.ownerNote ?? texts.ownerNoteEmpty}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
