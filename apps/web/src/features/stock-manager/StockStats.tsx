import { StatTile, StatTiles } from '@/shared/ui';
import { formatNumber } from '@/shared/lib/format';

import { stockManagerContent as texts } from './content';
import styles from './StockStats.module.css';
import type { StockOverview } from './model';

export interface StockStatsProps {
  readonly overview: StockOverview;
}

/**
 * Показатели склада: позиций в справочнике, ниже порога, подходят к порогу,
 * зон хранения (issue #606, макет `Stock.body.html`).
 *
 * 🔴 Плитка отвечает на вопрос, который задают до таблицы: «надо ли сегодня
 * что-то заказывать». Раньше на него отвечала строка мелким кеглем под
 * фильтрами — её не видели.
 *
 * 🔴 Порог — владельческий ключ (ADR-134): у монтажника его нет вовсе, и
 * плиток про порог он не получает. Ключ отсутствует, а не приходит нулём:
 * «ниже порога никого» и «порогов не видно» — разные ответы.
 *
 * 🔴 Считается по всему справочнику, а не по отобранному фильтром: «пора
 * заказывать» — цифра склада, и меняться от набранного в поиске она не должна.
 * Поэтому «позиций в справочнике» приходит своим числом, а не длиной страницы.
 *
 * Компонент серверный: клиентского JS у него ноль.
 */
export function StockStats({ overview }: StockStatsProps) {
  const { lowCount, nearCount } = overview;

  return (
    <StatTiles label={texts.tilesLabel}>
      <StatTile label={texts.tileItems} value={formatNumber(overview.itemsTotal)} />

      {lowCount === undefined ? null : (
        /* 🔴 Краска приходит контрактом переменной, а не правкой кита: число
            плитки набрано `--ink`, и подмена значения на самой плитке красит
            ровно его. Так же устроены тинты строк в таблицах кита. */
        <StatTile
          className={lowCount > 0 ? styles.danger : undefined}
          label={texts.tileLow}
          value={formatNumber(lowCount)}
          note={lowCount > 0 ? texts.tileLowNote : texts.tileLowCalm}
        />
      )}

      {nearCount === undefined ? null : (
        <StatTile
          className={nearCount > 0 ? styles.warning : undefined}
          label={texts.tileNear}
          value={formatNumber(nearCount)}
          note={texts.tileNearNote}
        />
      )}

      <StatTile
        label={texts.tileZones}
        value={formatNumber(overview.zones.length)}
        note={texts.tileZonesNote}
      />
    </StatTiles>
  );
}
