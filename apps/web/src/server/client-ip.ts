/**
 * Адрес клиента из заголовков прокси. Единственная реализация на проект:
 * аудит нашёл две разошедшиеся копии (в auth и http) — обе предпочитали
 * X-Forwarded-For, хотя доверенный заголовок здесь X-Real-IP: его Caddy
 * ставит сам из TCP-соединения, и подделать его снаружи нельзя. Caddy 2.5+
 * чужой XFF и так не пропускает, но код не должен зависеть от настройки
 * прокси — при её смене спуфинг ключа rate-limit вернулся бы молча.
 */
export function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip')?.trim();
  if (real !== undefined && real !== '') return real;

  // запасной путь для окружений без Caddy (тесты, прямой заход на :3000)
  const first = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (first !== undefined && first !== '') return first;

  return 'unknown';
}
