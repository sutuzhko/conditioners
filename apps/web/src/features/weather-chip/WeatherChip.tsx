'use client';

import { useEffect, useState } from 'react';

import { formatDegrees } from '@/shared/lib/format';

import { weatherChipContent as t } from './content';
import { loadWeather } from './lib';
import type { ChipWeather, WeatherApi } from './model';
import styles from './WeatherChip.module.css';

/** Шаг обновления — тот же, с каким обновляется прогноз у сервиса. */
const REFRESH_MS = 15 * 60_000;

export interface WeatherChipProps {
  /** Значения из серверного рендера — они и стоят в HTML. */
  readonly weather: ChipWeather;
  readonly api?: WeatherApi | undefined;
}

/**
 * Чип погоды первого экрана.
 *
 * 🔴 Цифры приходят в HTML с сервера (инвариант 1) — клиент их только
 * освежает. Вкладку с сайтом держат открытой часами, а страница отдаётся из
 * кеша ISR: без обновления посетитель видит температуру того момента, когда
 * страницу собрали, и она может расходиться с реальностью на весь день.
 *
 * Обновляем раз в четверть часа и при возвращении к вкладке: пока её не
 * смотрят, ходить в сеть незачем.
 */
export function WeatherChip({ weather, api = { load: loadWeather } }: WeatherChipProps) {
  const [current, setCurrent] = useState(weather);

  // серверные данные новее клиентских, если страницу пересобрали
  useEffect(() => {
    setCurrent(weather);
  }, [weather]);

  useEffect(() => {
    let alive = true;

    const refresh = async (): Promise<void> => {
      if (document.visibilityState === 'hidden') return;

      const fresh = await api.load();
      // осечка сервиса оставляет прежние цифры: они честнее прочерка
      if (alive && fresh !== null) setCurrent(fresh);
    };

    const timer = setInterval(() => void refresh(), REFRESH_MS);
    const onVisible = (): void => void refresh();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [api]);

  return (
    <p className={styles.chip}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>
        {`${t.today} ${t.mean} `}
        <b className={styles.mean}>{formatDegrees(current.mean)}</b>
        {` · ${t.peak} `}
        <b className={styles.max}>{formatDegrees(current.max)}</b>
        {` — ${t.note(current.max)}`}
      </span>
    </p>
  );
}
