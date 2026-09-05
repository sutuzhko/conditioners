import type { Metadata } from 'next';
import Link from 'next/link';

import {
  SETTINGS_GROUPS,
  missingFieldLabels,
  toGroupValue,
  type GroupEntry,
} from '@/features/settings-form';
import { requireOwnerPage } from '@/server/guards';
import { getAll, readiness } from '@/server/repo/settings';
import { Alert } from '@/shared/ui';

import { CompanyEditor } from './CompanyEditor';
import styles from './page.module.css';
import { companyPageContent as texts } from './content';

export const metadata: Metadata = { title: 'Компания' };

/* Страница читает настройки при каждом заходе: она же их и правит. */
export const dynamic = 'force-dynamic';

/**
 * Данные компании — всё, что на сайте нельзя зашить в код (инвариант 8).
 *
 * 🔴 Готовность считается здесь же, тем самым кодом, что и на странице-
 * указателе (`readiness`): заполняют данные тут, а видно про них было там.
 * Второго счёта нет — он разошёлся бы с первым, и владелец читал бы два
 * разных ответа на один вопрос (issue #617).
 *
 * 🔴 Группы сохраняются одной кнопкой. Контракт остаётся прежним — `PUT` на
 * группу (docs/API.md §5), — но нажатие одно: тринадцать кнопок на экране
 * означали, что владелец, поправивший телефон и адрес, уезжал с сохранённым
 * телефоном и потерянным адресом.
 */
export default async function AdminCompanyPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  /* Обе выборки идут одним запросом к базе: `getAll` кеширован на проход
     рендера, а `readiness` считает по нему же. */
  const [settings, report] = await Promise.all([getAll(), readiness()]);

  const entries: readonly GroupEntry[] = SETTINGS_GROUPS.map((group) => {
    const issues = report.groups.find((row) => row.key === group.key)?.issues ?? [];

    return {
      group,
      value: toGroupValue(settings[group.key]),
      ready: issues.length === 0,
      missing: missingFieldLabels(group, issues),
    };
  });

  const unfilled = entries.filter((entry) => !entry.ready).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {/* Возврат к указателю тем же приёмом, что «← Все заказы» в карточке
            наряда: колонка разделов вторым уровнем навигации не подменяется. */}
        <Link className={styles.back} href={{ pathname: '/admin/settings' }}>
          {texts.back}
        </Link>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      {unfilled === 0 ? null : (
        <Alert tone="warning" title={texts.unfilledTitle(unfilled)}>
          {texts.unfilledText}
        </Alert>
      )}

      <CompanyEditor entries={entries} />
    </div>
  );
}
