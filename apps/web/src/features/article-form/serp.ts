/**
 * Что поисковик покажет в выдаче.
 *
 * 🔴 Правила повторяют страницу статьи один в один
 * (`app/(site)/knowledge/[slug]/page.tsx`): свой заголовок статьи главнее
 * шаблона и суффикс бренда к нему не дописывается, описание берётся из анонса,
 * когда своего нет, адрес собирается из слага. Второй набор правил разошёлся
 * бы с первым, и превью врало бы — а его для того и показывают, чтобы правили
 * title, глядя на него.
 */
import { absoluteUrl, articlePath, buildTitle } from '@/shared/seo';

export type SerpInput = {
  readonly title: string;
  readonly seoTitle: string;
  readonly excerpt: string;
  readonly seoDescription: string;
  readonly slug: string;
  /** Адрес сайта из конфигурации сервера: в коде его нет (инвариант 8). */
  readonly siteUrl: string;
  /** Приписка к заголовкам из настроек компании; пусто — её нет. */
  readonly titleSuffix: string;
};

export type SerpSnippet = {
  readonly title: string;
  readonly description: string;
  /** Абсолютный канонический адрес — его же увидит поисковик. */
  readonly canonical: string;
  /** Тот же адрес хлебной крошкой: `tulaklimat.ru › knowledge › slug`. */
  readonly crumbs: string;
};

/**
 * Слаг, каким его соберёт сервер: пустое поле означает «собрать из заголовка».
 *
 * Здесь он не транслитерируется — этим занят сервер, и повторять его правила
 * в панели значит однажды разойтись с ними. Пока слага нет, превью честно
 * показывает место под него.
 */
export function serpSlug(slug: string): string {
  return slug.trim();
}

export function buildSerpSnippet(input: SerpInput): SerpSnippet {
  const ownTitle = input.seoTitle.trim();
  const ownDescription = input.seoDescription.trim();
  const slug = serpSlug(input.slug);

  const title =
    ownTitle === '' ? (buildTitle(input.title, input.titleSuffix) ?? input.title) : ownTitle;

  const canonical = absoluteUrl(input.siteUrl, slug === '' ? '' : articlePath(slug));

  return {
    title,
    description: ownDescription === '' ? input.excerpt : ownDescription,
    canonical,
    crumbs: canonical.replace(/^https?:\/\//i, '').replace(/\//g, ' › '),
  };
}
