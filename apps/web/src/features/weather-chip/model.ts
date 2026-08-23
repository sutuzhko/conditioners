import { z } from 'zod';

/**
 * Погода в чипе первого экрана.
 *
 * Схема одна на две стороны: сервер отдаёт ею же проверенный ответ, клиент
 * ею же разбирает полученное. Значения приходят из чужого сервиса, а чужому
 * ответу верить нельзя ни на сервере, ни в браузере.
 */
export const chipWeatherSchema = z.object({
  /** Среднесуточная температура сегодня, °C. */
  mean: z.number(),
  /** Максимум за последние тридцать дней, °C. */
  max: z.number(),
});

export type ChipWeather = z.infer<typeof chipWeatherSchema>;

/** Как чип получает свежие данные. В тестах подменяется. */
export type WeatherApi = {
  readonly load: () => Promise<ChipWeather | null>;
};
