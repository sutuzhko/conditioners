/** Фотографии модели — контракт docs/API.md §3. */
export type PhotoItem = {
  readonly id: string;
  readonly url: string;
  readonly alt: string | null;
  readonly isMain: boolean;
  readonly sort: number;
};

export type PhotoUploadResult =
  | { readonly ok: true; readonly photo: PhotoItem }
  | { readonly ok: false; readonly message: string };

export type PhotoActionResult = { readonly ok: boolean; readonly message?: string };

export type PhotoApi = {
  readonly upload: (file: File) => Promise<PhotoUploadResult>;
  readonly patch: (
    photoId: string,
    patch: { alt?: string | null; isMain?: boolean },
  ) => Promise<PhotoActionResult>;
  readonly remove: (photoId: string) => Promise<PhotoActionResult>;
};
