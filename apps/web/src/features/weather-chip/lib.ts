import { chipWeatherSchema, type ChipWeather } from './model';

/** Адрес свежей погоды — контракт из docs/API.md §13. */
export const WEATHER_ENDPOINT = '/api/weather';

/**
 * Забирает погоду у своего сервера, а не у чужого сервиса напрямую: ключей
 * и координат в браузере быть не должно, а ответ уже сходил через наш кеш.
 *
 * Любая осечка — `null`: чип оставит прежние цифры. Показать «—» вместо
 * температуры хуже, чем показать значение пятнадцатиминутной давности.
 */
export async function loadWeather(): Promise<ChipWeather | null> {
  try {
    const response = await fetch(WEATHER_ENDPOINT, { cache: 'no-store' });
    if (!response.ok) return null;

    const parsed = chipWeatherSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
