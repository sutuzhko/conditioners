import { z } from 'zod';

import type { Geo } from '@/entities/settings/model';

/**
 * Погода в городе для чипа первого экрана (BUGS, P2; макет — «HERO»).
 *
 * 🔴 Запрос серверный и кешируется на час: в прототипе он уходил из браузера
 * при загрузке страницы и стоял на критическом пути LCP. Здесь его результат
 * приезжает вместе с готовым HTML, а посетитель за него не платит ничем.
 *
 * 🔴 Внешний сервис считается ненадёжным по умолчанию (docs/CLAUDE.md,
 * «Безопасность»): таймаут, разбор ответа схемой, любая осечка — `null` и
 * страница без чипа. Первый экран не имеет права зависеть от чужого сервиса.
 *
 * Координаты берутся из настроек компании, а не из кода (инвариант 8). Не
 * заполнены — запроса нет вовсе: гадать, где стоит бизнес, мы не вправе.
 */

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

/** Часовой пояс запроса: дневной максимум считается по местным суткам. */
const TIME_ZONE = 'Europe/Moscow';

/** Больше секунды первый экран ждать не будет — лучше без чипа, чем медленно. */
const TIMEOUT_MS = 1500;

/** Час — шаг, с которым обновляется и сама страница (ISR). */
const CACHE_SECONDS = 3600;

const responseSchema = z.object({
  daily: z.object({
    temperature_2m_max: z.array(z.number()).min(1),
    temperature_2m_mean: z.array(z.number()).min(1),
  }),
});

export type CityWeather = {
  /**
   * Среднесуточная температура, °C — округлённая: доли градуса читателю не
   * нужны. Именно средняя, а не «сейчас»: чип говорит про день целиком, по
   * ней человек и прикидывает, нужен ли кондиционер (макет, «HERO»).
   */
  readonly mean: number;
  /** Дневной максимум, °C — пик, ради которого технику и покупают. */
  readonly max: number;
};

export async function getCityWeather(geo: Geo): Promise<CityWeather | null> {
  const { lat, lng } = geo;
  if (lat === null || lng === null) return null;

  const url = new URL(ENDPOINT);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_mean');
  url.searchParams.set('timezone', TIME_ZONE);
  url.searchParams.set('forecast_days', '1');

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) return null;

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    const max = parsed.data.daily.temperature_2m_max[0];
    const mean = parsed.data.daily.temperature_2m_mean[0];
    if (max === undefined || mean === undefined) return null;

    return { mean: Math.round(mean), max: Math.round(max) };
  } catch {
    // Сервис недоступен, отвечает медленно или мусором — чипа просто не будет.
    return null;
  }
}
