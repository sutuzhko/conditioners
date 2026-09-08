// Копия контракта типизированных маршрутов Next (issue #883).
//
// 🔴 Файл собирается из дерева apps/web/src/app командой
//    node scripts/routes-contract.mjs --write
// Правки руками теряются при следующей сборке; тест сверяет файл в git с
// генерацией и краснеет на расхождении.
//
// Зачем: типы typedRoutes живут в .next/types, которого в рабочем дереве
// может не быть — и тогда tsc не видит целого класса ошибок. Эта копия
// подставляется вместо .next/types в apps/web/tsconfig.routes.json.
//
// 🔴 Ссылки ниже заменяют next-env.d.ts, который эта проверка не берёт:
// он тянет ./.next/types/routes.d.ts, а весь смысл копии в том, чтобы
// работать без .next. Без ссылок пропадут типы CSS-модулей и картинок.

/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare namespace __next_route_internal_types__ {
  type SearchOrHash = `?${string}` | `#${string}`;
  type WithProtocol = `${string}:${string}`;

  type Suffix = '' | SearchOrHash;

  type SafeSlug<S extends string> = S extends `${string}/${string}`
    ? never
    : S extends `${string}${SearchOrHash}`
      ? never
      : S extends ''
        ? never
        : S;

  type CatchAllSlug<S extends string> = S extends `${string}${SearchOrHash}`
    ? never
    : S extends ''
      ? never
      : S;

  type OptionalCatchAllSlug<S extends string> = S extends `${string}${SearchOrHash}` ? never : S;

  type StaticRoutes =
    | `/`
    | `/admin`
    | `/admin/activity`
    | `/admin/catalog`
    | `/admin/catalog/new`
    | `/admin/catalog/specs`
    | `/admin/clients`
    | `/admin/clients/new`
    | `/admin/company`
    | `/admin/crm`
    | `/admin/knowledge`
    | `/admin/knowledge/new`
    | `/admin/leads`
    | `/admin/login`
    | `/admin/notifications`
    | `/admin/orders`
    | `/admin/orders/new`
    | `/admin/prices`
    | `/admin/profile`
    | `/admin/reviews`
    | `/admin/settings`
    | `/admin/stock`
    | `/admin/stock/items/new`
    | `/admin/stock/journal`
    | `/admin/stock/move`
    | `/admin/stock/zones`
    | `/admin/stock/zones/new`
    | `/admin/team`
    | `/admin/team/new`
    | `/api/admin/articles`
    | `/api/admin/blocks`
    | `/api/admin/clients`
    | `/api/admin/crm`
    | `/api/admin/crm/search`
    | `/api/admin/leads`
    | `/api/admin/models`
    | `/api/admin/orders`
    | `/api/admin/orders/assign`
    | `/api/admin/prices`
    | `/api/admin/profile`
    | `/api/admin/profile/password`
    | `/api/admin/profile/sessions`
    | `/api/admin/revalidate`
    | `/api/admin/reviews`
    | `/api/admin/settings`
    | `/api/admin/settings/readiness`
    | `/api/admin/staff`
    | `/api/admin/stock`
    | `/api/admin/stock/items`
    | `/api/admin/stock/movements`
    | `/api/admin/stock/zones`
    | `/api/auth/login`
    | `/api/auth/logout`
    | `/api/auth/me`
    | `/api/health`
    | `/api/leads`
    | `/api/leads/to-reminder`
    | `/api/prices`
    | `/api/reviews`
    | `/api/telegram/webhook`
    | `/api/weather`
    | `/catalog`
    | `/compare`
    | `/knowledge`
    | `/privacy`
    | `/robots.txt`;

  type DynamicRoutes<T extends string = string> =
    | `/admin/${CatchAllSlug<T>}`
    | `/admin/catalog/${SafeSlug<T>}`
    | `/admin/clients/${SafeSlug<T>}`
    | `/admin/knowledge/${SafeSlug<T>}`
    | `/admin/orders/${SafeSlug<T>}`
    | `/admin/orders/${SafeSlug<T>}/edit`
    | `/admin/orders/${SafeSlug<T>}/handover`
    | `/admin/stock/items/${SafeSlug<T>}`
    | `/admin/team/${SafeSlug<T>}`
    | `/api/admin/articles/${SafeSlug<T>}`
    | `/api/admin/articles/${SafeSlug<T>}/cover`
    | `/api/admin/blocks/${SafeSlug<T>}`
    | `/api/admin/clients/${SafeSlug<T>}`
    | `/api/admin/clients/${SafeSlug<T>}/units`
    | `/api/admin/clients/${SafeSlug<T>}/units/${SafeSlug<T>}`
    | `/api/admin/clients/${SafeSlug<T>}/units/${SafeSlug<T>}/photo`
    | `/api/admin/crm/${SafeSlug<T>}`
    | `/api/admin/leads/${SafeSlug<T>}`
    | `/api/admin/leads/${SafeSlug<T>}/client`
    | `/api/admin/leads/${SafeSlug<T>}/order`
    | `/api/admin/leads/${SafeSlug<T>}/photo`
    | `/api/admin/models/${SafeSlug<T>}`
    | `/api/admin/models/${SafeSlug<T>}/photos`
    | `/api/admin/models/${SafeSlug<T>}/photos/${SafeSlug<T>}`
    | `/api/admin/models/${SafeSlug<T>}/sale`
    | `/api/admin/notifications/${SafeSlug<T>}/retry`
    | `/api/admin/notifications/recipients/${SafeSlug<T>}`
    | `/api/admin/orders/${SafeSlug<T>}`
    | `/api/admin/orders/${SafeSlug<T>}/checklist`
    | `/api/admin/orders/${SafeSlug<T>}/checklist/${SafeSlug<T>}`
    | `/api/admin/orders/${SafeSlug<T>}/consumption`
    | `/api/admin/orders/${SafeSlug<T>}/consumption/${SafeSlug<T>}`
    | `/api/admin/orders/${SafeSlug<T>}/docs`
    | `/api/admin/orders/${SafeSlug<T>}/docs/${SafeSlug<T>}`
    | `/api/admin/orders/${SafeSlug<T>}/docs/${SafeSlug<T>}/file`
    | `/api/admin/orders/${SafeSlug<T>}/photos`
    | `/api/admin/orders/${SafeSlug<T>}/photos/${SafeSlug<T>}`
    | `/api/admin/orders/${SafeSlug<T>}/photos/${SafeSlug<T>}/file`
    | `/api/admin/orders/${SafeSlug<T>}/result`
    | `/api/admin/reviews/${SafeSlug<T>}`
    | `/api/admin/reviews/${SafeSlug<T>}/status`
    | `/api/admin/settings/${SafeSlug<T>}`
    | `/api/admin/staff/${SafeSlug<T>}`
    | `/api/admin/staff/${SafeSlug<T>}/access`
    | `/api/admin/staff/${SafeSlug<T>}/notes`
    | `/api/admin/staff/${SafeSlug<T>}/notes/${SafeSlug<T>}`
    | `/api/admin/stock/items/${SafeSlug<T>}`
    | `/api/admin/stock/zones/${SafeSlug<T>}`
    | `/api/media/${SafeSlug<T>}`
    | `/api/settings/${SafeSlug<T>}`
    | `/catalog/${SafeSlug<T>}`
    | `/knowledge/${SafeSlug<T>}`;

  type RouteImpl<T> =
    | StaticRoutes
    | SearchOrHash
    | WithProtocol
    | `${StaticRoutes}${SearchOrHash}`
    | (T extends `${DynamicRoutes<infer _>}${Suffix}` ? T : never);
}

declare module 'next' {
  export { default } from 'next/types.js';
  export * from 'next/types.js';

  export type Route<T extends string = string> = __next_route_internal_types__.RouteImpl<T>;
}

declare module 'next/link' {
  export { useLinkStatus } from 'next/dist/client/link.js';

  import type { LinkProps as OriginalLinkProps } from 'next/dist/client/link.js';
  import type { AnchorHTMLAttributes, DetailedHTMLProps } from 'react';
  import type { UrlObject } from 'url';

  type LinkRestProps = Omit<
    Omit<
      DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>,
      keyof OriginalLinkProps
    > &
      OriginalLinkProps,
    'href'
  >;

  export type LinkProps<RouteInferType> = LinkRestProps & {
    href: __next_route_internal_types__.RouteImpl<RouteInferType> | UrlObject;
  };

  export default function Link<RouteType>(props: LinkProps<RouteType>): JSX.Element;
}

declare module 'next/navigation' {
  export * from 'next/dist/client/components/navigation.js';

  import type {
    NavigateOptions,
    AppRouterInstance as OriginalAppRouterInstance,
  } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
  import type { RedirectType } from 'next/dist/client/components/redirect-error.js';

  interface AppRouterInstance extends OriginalAppRouterInstance {
    push<RouteType>(
      href: __next_route_internal_types__.RouteImpl<RouteType>,
      options?: NavigateOptions,
    ): void;
    replace<RouteType>(
      href: __next_route_internal_types__.RouteImpl<RouteType>,
      options?: NavigateOptions,
    ): void;
    prefetch<RouteType>(href: __next_route_internal_types__.RouteImpl<RouteType>): void;
  }

  export function useRouter(): AppRouterInstance;

  export function redirect<RouteType>(
    url: __next_route_internal_types__.RouteImpl<RouteType>,
    type?: RedirectType,
  ): never;

  export function permanentRedirect<RouteType>(
    url: __next_route_internal_types__.RouteImpl<RouteType>,
    type?: RedirectType,
  ): never;
}

declare module 'next/form' {
  import type { FormProps as OriginalFormProps } from 'next/dist/client/form.js';

  type FormRestProps = Omit<OriginalFormProps, 'action'>;

  export type FormProps<RouteInferType> = {
    action:
      __next_route_internal_types__.RouteImpl<RouteInferType> | ((formData: FormData) => void);
  } & FormRestProps;

  export default function Form<RouteType>(props: FormProps<RouteType>): JSX.Element;
}
