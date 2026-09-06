/** Данные для историй и тестов блока фотографий. */
import type { PhotoApi, PhotoItem } from './model';

/**
 * Снимки прямо в фикстуре: data-URI, чтобы истории не зависели ни от
 * загруженных файлов, ни от работающего `/media`.
 *
 * 🔴 Витрина собирается статикой (ADR-231) и раздаёт только `apps/web/public`,
 * где лежат одни шрифты. Адрес `/media/...` в ней мёртв, и раздел фотографий
 * модели показывал значки битых файлов вместо самих фотографий — issue #676.
 *
 * `next/image` для `data:` сам ставит `unoptimized` (`get-img-props`), поэтому
 * ни одного пропа ради витрины в боевой код не уезжает.
 *
 * Квадрат — та же форма, что у превью 132×132: миниатюре задан
 * `aspect-ratio: 1`, и кадр другой формы сдвинул бы сетку.
 */
function samplePhoto(body: string): string {
  return (
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">' +
        '<rect width="300" height="300" fill="#E2F4F8"/>' +
        body +
        '</svg>',
    )
  );
}

/** Внутренний блок на стене — главный кадр карточки. */
const INDOOR_PHOTO = samplePhoto(
  '<rect x="46" y="104" width="208" height="66" rx="16" fill="#FFFFFF" stroke="#A5F3FC" stroke-width="4"/>' +
    '<rect x="66" y="148" width="168" height="8" rx="4" fill="#A5F3FC"/>' +
    '<circle cx="226" cy="122" r="6" fill="#A5F3FC"/>',
);

/** Наружный блок: вторая половина сплит-системы, её тоже спрашивают. */
const OUTDOOR_PHOTO = samplePhoto(
  '<rect x="56" y="86" width="188" height="128" rx="14" fill="#FFFFFF" stroke="#A5F3FC" stroke-width="4"/>' +
    '<circle cx="150" cy="150" r="44" fill="none" stroke="#A5F3FC" stroke-width="4"/>' +
    '<circle cx="150" cy="150" r="12" fill="#A5F3FC"/>' +
    '<rect x="76" y="100" width="148" height="6" rx="3" fill="#CFF2F8"/>',
);

/** Пульт: третий кадр появляется после загрузки в истории с приёмом файла. */
const REMOTE_PHOTO = samplePhoto(
  '<rect x="110" y="58" width="80" height="184" rx="18" fill="#FFFFFF" stroke="#A5F3FC" stroke-width="4"/>' +
    '<rect x="126" y="80" width="48" height="34" rx="6" fill="#CFF2F8"/>' +
    '<circle cx="140" cy="140" r="8" fill="#A5F3FC"/>' +
    '<circle cx="164" cy="140" r="8" fill="#A5F3FC"/>' +
    '<rect x="126" y="176" width="48" height="8" rx="4" fill="#A5F3FC"/>',
);

export const photosFixture: readonly PhotoItem[] = [
  { id: 'a', url: INDOOR_PHOTO, alt: 'Внутренний блок на стене', isMain: true, sort: 0 },
  { id: 'b', url: OUTDOOR_PHOTO, alt: null, isMain: false, sort: 1 },
];

/** Набор запросов, который всё принимает: истории смотрят глазами. */
export const acceptingApi: PhotoApi = {
  upload: async () => ({
    ok: true,
    photo: { id: 'c', url: REMOTE_PHOTO, alt: null, isMain: false, sort: 2 },
  }),
  patch: async () => ({ ok: true }),
  remove: async () => ({ ok: true }),
};

export const failingApi: PhotoApi = {
  upload: async () => ({ ok: false, message: 'Фото больше 5 МБ. Уменьшите снимок' }),
  patch: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
  remove: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
};
