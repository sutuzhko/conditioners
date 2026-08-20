import { db } from '@/server/db';

/**
 * Временная страница волны 0. Существует ровно для того, чтобы доказать:
 * контейнеры поднялись, база засеяна, серверный рендер отдаёт данные из БД.
 * Заменяется главной страницей в блоковой волне (docs/ORCHESTRATION.md).
 */
export const dynamic = 'force-dynamic';

export default async function Page() {
  const [products, prices, articles, settings] = await Promise.all([
    db.product.count(),
    db.priceRow.count(),
    db.article.count(),
    db.setting.count(),
  ]);

  const rows = [
    ['Товары', products],
    ['Строки прайса', prices],
    ['Статьи', articles],
    ['Группы настроек', settings],
  ] as const;

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 'var(--fs-h2)' }}>Каркас поднят</h1>
      <p style={{ color: 'var(--body)' }}>
        Страница отдана сервером с данными из базы. Это проверка фундамента, а не главная — её
        соберут в блоковой волне.
      </p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px' }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ color: 'var(--muted)' }}>{label}</dt>
            <dd style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
