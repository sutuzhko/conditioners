import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import type { AdminSession } from '@/server/auth';
import { navCounts } from '@/server/services/nav-counts';
import { AdminShell, NAV_COOKIE } from '@/widgets/admin-shell';

/**
 * Оболочка панели: колонка разделов, счётчики и карточка вошедшего.
 *
 * 🔴 Вынесена из layout'а раздела, потому что оболочек стало две (issue #631).
 * Несуществующий адрес не может показываться внутри `(panel)`: у той группы
 * есть заготовка загрузки, а она открывает поток ответа раньше, чем страница
 * успевает сказать «не найдено», — и код 404 подменяется на 200. Группа без
 * заготовки отвечает честно, но своя копия оболочки в ней означала бы, что
 * счётчики и колонка правятся в двух местах. Правятся в одном — здесь.
 *
 * Сессию берёт снаружи: обе оболочки проверяют вход по-своему — раздел ещё и
 * сверяет роль с разделом, страница «не найдено» сверять ей нечего.
 */
export async function PanelFrame({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  /* Состояние колонки разделов читается на сервере: развёрнутая по умолчанию
     панель, схлопывающаяся после гидратации, мигала бы на каждом заходе. */
  const cookieJar = await cookies();
  const navOpen = cookieJar.get(NAV_COOKIE)?.value !== 'off';

  /* 🔴 Счётчики очередей считаются здесь, один раз на заход, и приходят в
     оболочку пропсами (ADR-309). Раздел, заводящий свой счётчик, видит только
     себя: цифра у «Заявок» появлялась бы, лишь пока открыты сами заявки. */
  const counts = await navCounts(session.role);

  return (
    <AdminShell
      login={session.login}
      name={session.name}
      role={session.role}
      navOpen={navOpen}
      counts={counts}
    >
      {children}
    </AdminShell>
  );
}
