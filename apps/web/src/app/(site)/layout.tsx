import type { z } from 'zod';
import { getAll } from '@/server/repo/settings';
import { settingSchemas } from '@/entities/settings/model';
import { Header } from '@/widgets/header';
import { Footer } from '@/widgets/footer';
import { SITE_NAV, LEAD_ANCHOR, POLICY_HREF } from '@/shared/config/nav';

/**
 * Каркас публичной части. Данные компании читаются здесь один раз и раздаются
 * шапке и футеру: единственный источник гарантирует, что телефон в шапке и
 * телефон в футере не разойдутся (инвариант 8).
 */

// У всех полей групп есть значения по умолчанию, поэтому разбор пустой группы
// безопасен: битая запись в базе не должна ронять весь сайт. Схема передаётся
// значением, а не ключом, — так тип выводится точно и не нужны приведения.
// z.infer, а не z.ZodType<T>: у схем с .default() тип входа и тип выхода
// различаются, и связывать обобщение по входу — значит получить поля
// необязательными там, где после разбора они уже гарантированы.
function parseGroup<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.infer<S> {
  const parsed = schema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : schema.parse({});
}

export const revalidate = 3600;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getAll();
  const company = parseGroup(settingSchemas.company, settings.company);
  const contacts = parseGroup(settingSchemas.contacts, settings.contacts);

  return (
    <>
      <Header company={company} contacts={contacts} nav={SITE_NAV} ctaHref={LEAD_ANCHOR} />
      <main id="top">{children}</main>
      <Footer
        company={company}
        contacts={contacts}
        address={parseGroup(settingSchemas.address, settings.address)}
        legal={parseGroup(settingSchemas.legal, settings.legal)}
        nav={SITE_NAV}
        policyHref={POLICY_HREF}
      />
    </>
  );
}
