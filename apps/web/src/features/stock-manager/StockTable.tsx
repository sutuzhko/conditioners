import Link from 'next/link';

import {
  Badge,
  Card,
  EmptyState,
  Icon,
  Table,
  buttonClassName,
  type BadgeVariant,
} from '@/shared/ui';

import { STOCK_UNIT_TITLES, formatQty, stockManagerContent as texts } from './content';
import { StockCell } from './StockCell';
import { StockMoveScope } from './StockMoveScope';
import { StockPager } from './StockPager';
import { StockRowMenu } from './StockRowMenu';
import {
  DEFAULT_STOCK_FILTERS,
  STOCK_MOVE_PATH,
  STOCK_PATH,
  STOCK_ZONES_PATH,
  filledZones,
  hasShortage,
  stockFiltersApplied,
  stockItemPath,
  stockMoveQuery,
  stockQuery,
  zoneQty,
  type StockFilterState,
  type StockItemCard,
  type StockOverview,
  type StockZoneCard,
} from './model';
import styles from './StockTable.module.css';

export interface StockTableProps {
  readonly overview: StockOverview;
  /** Действующий фильтр: он переезжает на соседние страницы вместе с «Дальше». */
  readonly filters?: StockFilterState | undefined;
}

/**
 * Остатки: строки — позиции, колонки — зоны хранения (CRM.md §11.3).
 *
 * 🔴 Таблица существует ради перемещения между зонами, а не ради созерцания
 * (ADR-137): остаток перетаскивается мышью в соседнюю зону, а кнопка
 * «Переместить» в строке делает то же самое пальцем и с клавиатуры. Раздел
 * полностью работоспособен без единого перетаскивания.
 *
 * Разметку по-прежнему рисует сервер: клиентские только сами ячейки-ручки, и
 * ими же ограничен весь JS раздела. Заголовки, ссылки и разбивка приходят
 * готовыми.
 *
 * 🔴 Единица вынесена в свою колонку после названия, «Итого» стоит перед
 * «Порогом», а сам итог — пилюля по состоянию (issue #607, макет
 * `Stock.body.html`). Числа в ячейках зон и в пороге остались числами: «12 м»
 * в каждой из шести колонок — это шесть повторений одной и той же буквы,
 * из-за которых колонка зоны была вдвое шире нужного.
 *
 * 🔴 Залипают обе стороны: слева позиция, справа итог, порог и меню строки
 * (issue #42, #352, #573). Без первой на четвёртой зоне непонятно, чей это
 * остаток; без второй «Итого» — то, ради чего в таблицу и смотрят, —
 * обрывалось краем экрана. Страница по горизонтали при этом не двигается:
 * прокрутка живёт внутри контейнера. Липнет правая тройка только от 900px: на
 * планшете она отняла бы у зон больше места, чем сама стоит, — там макет
 * оставляет одну липкую колонку слева и затухание у правого края.
 *
 * 🔴 До 600px строка раскладывается карточкой: колонок там не остаётся, и
 * таблица из шести зон читается только вбок. В карточке остаток крупно
 * пилюлей, зоны — чипами, «не хватает» — словами (issue #609, макет 390).
 *
 * 🔴 Ширины колонок задаёт CSS, а не проп `minWidth`. Проп кладёт `min-width`
 * инлайном, снять его в медиа-запросе нечем — и карточка на 390 выходила
 * 1080px шириной, утаскивая за собой весь документ. Прокрутка обязана жить
 * внутри контейнера, а не растягивать предков (issue #352, DESIGN_BRIEF §6).
 *
 * 🔴 Строка ниже порога помечена целиком (`data-danger`), а не одной плашкой
 * в углу: список «пора заказывать» — это и есть подсвеченные строки, отдельного
 * экрана под него нет (CRM.md §11.3).
 *
 * 🔴 Отрицательный остаток помечается, а не запрещается (ADR-134): запрет
 * означал бы, что монтажник впишет неправду, лишь бы закрыть наряд.
 */
export function StockTable({ overview, filters = DEFAULT_STOCK_FILTERS }: StockTableProps) {
  if (overview.zones.length === 0) return <NoZones />;
  if (overview.items.length === 0) return <NoItems filters={filters} />;

  const { zones, items } = overview;
  /* Порог — владельческий ключ: монтажнику его не приходит вовсе, и колонка
     тогда не рисуется, а не показывает прочерки (docs/API.md §14). */
  const showMin = items.some((item) => item.minQty !== undefined);
  const shortage = items.some((item) => hasShortage(item, zones));
  /* Перемещать некуда, пока зона одна: предлагать операцию, которую сервер
     отвергнет, честнее не предлагать вовсе. */
  const movable = zones.filter((zone) => !zone.archived).length > 1;

  return (
    <div className={styles.wrap}>
      <StockMoveScope>
        {/* 🔴 Ниже 600px карточка списка снимает с себя рамку, фон и тень: под
            ней лежат пятнадцать своих карточек, и вторая коробка вокруг них
            только шумит. Одна скруглённая коробка на позицию — сама позиция. */}
        <Card as="section" padding="none" className={styles.board}>
          {/* 🔴 «Порога нет» — это разметка, а не догадка стилей: отступ
              залипающего итога считается от правого края области прокрутки, и
              вычитать ширину колонки, которой нет, значит увести итог влево
              поверх последней зоны (см. `.noMin` в модуле). */}
          <Table
            variant="cards"
            className={[styles.grid, showMin ? null : styles.noMin].filter(Boolean).join(' ')}
            zebra
            fade
            label={texts.tableLabel}
          >
            <thead>
              <tr role="row">
                <th scope="col" className={styles.itemHead}>
                  {texts.colItem}
                </th>
                <th scope="col" className={styles.unitHead}>
                  {texts.colUnit}
                </th>
                {zones.map((zone) => (
                  <th key={zone.id} scope="col" className={styles.numberHead}>
                    <span className={styles.zoneName}>{zone.name}</span>
                    <ZoneNote zone={zone} />
                  </th>
                ))}
                {/* 🔴 «Итого» перед «Порогом», как в макете: сравнивают итог с
                    порогом, а не порог с итогом, и главное число ряда стоит
                    первым. */}
                <th scope="col" className={`${styles.numberHead} ${styles.totalHead}`}>
                  {texts.colTotal}
                </th>
                {showMin ? (
                  <th scope="col" className={`${styles.numberHead} ${styles.minHead}`}>
                    {texts.colMin}
                  </th>
                ) : null}
                {/* Колонка свёртки зон живёт только на карточке телефона: выше
                    600px зоны стоят своими колонками, и она снята со страницы
                    целиком вместе с шапкой. */}
                <th scope="col" className={styles.zonesHead}>
                  {texts.zonesFoldLabel}
                </th>
                {/* Имя колонки читалке нужно, а на экране под ним стоит
                    подписанная кнопка меню. */}
                <th scope="col" className={styles.menuHead}>
                  <span className="srOnly">{texts.colActions}</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, row) => (
                /* 🔴 Пометка строки — это и есть список «пора заказывать»
                   (CRM.md §11.3): отдельного экрана под него нет. */
                <tr
                  key={item.id}
                  className={styles.row}
                  role="row"
                  data-danger={item.low === true ? '' : undefined}
                >
                  <th scope="row" role="rowheader" className={styles.itemHead}>
                    <Link
                      className={`${styles.name} tapAction`}
                      href={{ pathname: stockItemPath(item.id) }}
                    >
                      {item.name}
                    </Link>
                    <span className={styles.itemNote}>{item.group ?? texts.itemGroupNone}</span>

                    {movable ? (
                      <Link
                        className={`${styles.move} tapAction`}
                        href={{
                          pathname: STOCK_MOVE_PATH,
                          query: stockMoveQuery({ item: item.id, kind: 'transfer' }),
                        }}
                        aria-label={texts.moveRowTitle(item.name)}
                      >
                        {texts.moveRow}
                      </Link>
                    ) : null}
                  </th>

                  {/* 🔴 Единица — своя колонка, а не хвост у каждого числа
                      (issue #607). На карточке телефона колонки нет, и единица
                      возвращается к итогу и порогу хвостиком `unitTail`. */}
                  <td className={styles.unitCell} role="cell" data-label={texts.colUnit}>
                    {STOCK_UNIT_TITLES[item.unit]}
                  </td>

                  {zones.map((zone, column) => (
                    <StockCell
                      key={zone.id}
                      itemId={item.id}
                      itemName={item.name}
                      unit={item.unit}
                      zoneId={zone.id}
                      zoneName={zone.name}
                      qty={zoneQty(item, zone.id)}
                      closed={zone.archived}
                      first={row === 0 && column === 0}
                    />
                  ))}

                  <td
                    className={`${styles.number} ${styles.totalCell}`}
                    role="cell"
                    data-label={texts.colTotal}
                  >
                    <Badge
                      variant={totalTone(item)}
                      size="sm"
                      className={styles.total}
                      title={totalTitle(item)}
                    >
                      {formatQty(item.total)}
                      <span className={styles.unitTail}>{STOCK_UNIT_TITLES[item.unit]}</span>
                      {/* 🔴 Слово рядом с краской обязательно (ADR-081): шесть
                          красок панели различает не всякий глаз, а на печати
                          наряда они совпадают все. Видимого места оно не
                          занимает — состояние и без него читается сравнением
                          итога с порогом в соседней колонке, — но остаётся
                          единственным, что слышит озвучка. */}
                      <StateWord item={item} />
                    </Badge>
                  </td>

                  {showMin ? (
                    <td
                      className={`${styles.number} ${styles.minCell}`}
                      role="cell"
                      data-label={texts.colMin}
                    >
                      <Threshold item={item} />
                    </td>
                  ) : null}

                  {/* 🔴 Разбивка по зонам на телефоне свёрнута (issue #609):
                      развёрнутым списком одна позиция занимала 202px — две
                      трети экрана, — а первый вопрос к складу «чего не
                      хватает», а не «где именно лежит». Раскрытие — `details`,
                      то есть работа браузера: ни состояния, ни своего JS. */}
                  <td className={styles.zonesCell} role="cell" data-label="">
                    <ZonesFold item={item} zones={zones} />
                  </td>

                  {/* 🔴 Действия строки — то, чего разделу не хватало: правка
                      и архив жили только внутри карточки, и из списка о них
                      ничто не сообщало (issue #573). Удаления здесь нет —
                      архив, иначе журнал движений уходит вместе с позицией
                      (ADR-134, PIXEL_SPEC §«Панель»).

                      Подпись ячейки пустая, а не отсутствует: карточный режим
                      кита раскладывает ячейку без подписи отдельной строкой во
                      всю ширину, а меню стоит в шапке карточки рядом с итогом. */}
                  <td className={styles.menuCell} role="cell" data-label="">
                    <StockRowMenu item={item} movable={movable} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Подвал рисует сам пагинатор: когда листать нечего и выбирать шаг
              не из чего, под таблицей не остаётся пустой полосы с линией. */}
          <StockPager
            page={overview.page}
            pages={overview.pages}
            count={texts.shown(overview.items.length, overview.total)}
            scope={overview.itemsTotal}
            size={filters.size}
            basePath={STOCK_PATH}
            query={stockQuery(filters)}
          />
        </Card>
      </StockMoveScope>

      <p className={styles.hint}>{texts.tableHint}</p>
      {movable ? <p className={`${styles.hint} ${styles.pointerHint}`}>{texts.dragHint}</p> : null}
      {shortage ? <p className={styles.warning}>{texts.minusNote}</p> : null}
    </div>
  );
}

/**
 * Краска итога (issue #607, макет).
 *
 * 🔴 Словарь красок панели закрытый (ADR-081): `danger` — «Пора заказать»,
 * `warning` — «На исходе», `success` — «В наличии». Ровно эти три состояния у
 * остатка и есть, седьмой краски заводить не пришлось.
 *
 * 🔴 Минус — тоже предупреждение, а не отказ: склад разошёлся с реальностью, и
 * это повод для инвентаризации, а не для закупки (ADR-134).
 *
 * Без порога краска нейтральная: зелёное «в наличии» у позиции, за которой не
 * следят, обещало бы то, чего никто не проверял.
 */
function totalTone(item: StockItemCard): BadgeVariant {
  if (item.total < 0) return 'warning';
  if (item.low === true) return 'danger';
  if (item.near === true) return 'warning';

  return item.minQty === undefined || item.minQty === 0 ? 'neutral' : 'success';
}

/**
 * Состояние итога словом — для озвучки и печати.
 *
 * 🔴 Раньше здесь стояла видимая плашка «К заказу» рядом с числом: два
 * элемента в ячейке, и главная цифра ряда плясала по ширине. Макет заменил её
 * краской самой пилюли, а слово осталось — просто перестало занимать место.
 */
function StateWord({ item }: { readonly item: StockItemCard }) {
  if (item.total < 0) return <span className="srOnly">{texts.minus}</span>;
  if (item.low === true) return <span className="srOnly">{texts.low}</span>;
  if (item.near === true) return <span className="srOnly">{texts.nearTitle}</span>;

  return null;
}

/** Почему итог такой краски — подсказкой при наведении. */
function totalTitle(item: StockItemCard): string | undefined {
  if (item.total < 0) return texts.minusTitle;
  if (item.low === true) return texts.lowTitle;
  if (item.near === true) return texts.nearTitle;

  return undefined;
}

/**
 * Порог заказа.
 *
 * 🔴 На широком экране это колонка с числом, на карточке телефона — строка
 * словами: «Порог 40 м · не хватает 28» (макет 390). Разность считает система,
 * а не владелец в уме: колонки «Итого» рядом на карточке нет.
 */
function Threshold({ item }: { readonly item: StockItemCard }) {
  const minQty = item.minQty;
  if (minQty === undefined || minQty === 0) return <>{texts.dash}</>;

  return (
    <>
      <span className={styles.minValue}>{formatQty(minQty)}</span>
      <span className={styles.unitTail}>{STOCK_UNIT_TITLES[item.unit]}</span>
      {item.low === true ? (
        <span className={styles.state}>{texts.shortage(formatQty(minQty - item.total))}</span>
      ) : null}
      {item.near === true ? <span className={styles.state}>{texts.nearNote}</span> : null}
    </>
  );
}

/**
 * Разбивка по зонам одной строкой — только на карточке телефона.
 *
 * 🔴 Пустых зон в списке нет: четыре строки «Газель Зверева 0» подряд
 * занимали две трети экрана и не отвечали ни на один вопрос. Если позиции нет
 * нигде, свёртки нет вовсе — раскрывать нечего.
 */
function ZonesFold({
  item,
  zones,
}: {
  readonly item: StockItemCard;
  readonly zones: readonly StockZoneCard[];
}) {
  const filled = filledZones(item, zones);
  if (filled.length === 0) return null;

  return (
    <details className={styles.zones}>
      {/* 🔴 Раскрывашка не притворяется кнопкой: ни рамки, ни заливки —
          приглушённый текст того же веса, что «Порог 40 м», и шеврон. Она
          вспомогательная, а весила столько же, сколько главное число карточки.
          Тап-зона при этом прежняя, 44×44: её держит поле, а не рамка. */}
      <summary className={styles.zonesSummary}>
        {texts.zonesFold(filled.length)}
        <Icon className={styles.zonesChevron} name="chevron-down" size={14} />
      </summary>

      <ul className={styles.zonesList}>
        {filled.map((zone) => (
          <li className={styles.zonesItem} key={zone.id}>
            <span className={styles.zonesName}>{zone.name}</span>
            <span className={styles.zonesQty}>{texts.qty(zoneQty(item, zone.id), item.unit)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Подпись под названием зоны: чья это машина или что она в архиве. */
function ZoneNote({ zone }: { readonly zone: StockZoneCard }) {
  if (zone.archived) return <span className={styles.zoneNote}>{texts.zoneArchived}</span>;
  if (zone.userName === null) return null;

  return <span className={styles.zoneNote}>{texts.zoneOwner(zone.userName)}</span>;
}

/**
 * 🔴 Зон нет — таблице неоткуда взяться, и раздел говорит об этом прямо.
 * Названия зоны здесь нет ни одного: свой гараж владелец называет сам.
 */
function NoZones() {
  return (
    <Card as="section">
      <EmptyState
        icon="stock"
        title={texts.emptyZonesTitle}
        action={
          <Link className={buttonClassName({ size: 'sm' })} href={STOCK_ZONES_PATH}>
            {texts.emptyZonesAction}
          </Link>
        }
      >
        {texts.emptyZonesText}
      </EmptyState>
    </Card>
  );
}

/** Позиций не видно: либо справочник пуст, либо их отсеял фильтр. */
function NoItems({ filters }: { readonly filters: StockFilterState }) {
  if (!stockFiltersApplied(filters)) {
    return (
      <Card as="section">
        <EmptyState icon="stock" title={texts.emptyItemsTitle}>
          {texts.emptyItemsText}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card as="section">
      <EmptyState
        icon="search"
        title={filters.low ? texts.emptyLow : texts.emptyFound}
        action={
          <Link
            className={buttonClassName({ size: 'sm', variant: 'bordered' })}
            href={{ pathname: STOCK_PATH }}
          >
            {texts.searchReset}
          </Link>
        }
      >
        {filters.low ? texts.emptyLowText : texts.emptyFoundText}
      </EmptyState>
    </Card>
  );
}
