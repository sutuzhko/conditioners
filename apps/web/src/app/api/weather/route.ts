/**
 * Свежая погода для чипа первого экрана — docs/API.md §12.
 *
 * 🔴 Существует ради того, чтобы у открытой часами вкладки цифры не
 * устаревали: страница отдаётся из кеша ISR, и без этого адреса посетитель
 * видит температуру того момента, когда её собрали.
 *
 * Координаты берутся из настроек на сервере — в браузер они не уходят
 * (инвариант 8), как и обращение к чужому сервису: оно идёт через наш кеш.
 */
import { NO_STORE, json, notFound, withRoute } from '@/server/http';
import { getGroup } from '@/server/repo/settings';
import { geoSchema } from '@/entities/settings/model';
import { getCityWeather } from '@/server/weather';

export const dynamic = 'force-dynamic';

export const GET = withRoute(async () => {
  const stored = geoSchema.safeParse(await getGroup('geo'));
  if (!stored.success) return notFound('Погода');

  const weather = await getCityWeather(stored.data);
  // сервис молчит или координат нет — чипу нечего показать, прежние цифры останутся
  if (weather === null) return notFound('Погода');

  /* Ответ не кешируется браузером: за кеш отвечает серверный запрос к сервису
     (15 минут), и второй слой поверх него только запутал бы картину. */
  return json(weather, 200, NO_STORE);
});
