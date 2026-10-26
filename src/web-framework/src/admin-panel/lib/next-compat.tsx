// next/* compatibility shim for the Vite + TanStack Router admin.
//
// The admin's shared components were authored for the Next.js admin and import
// from next/link, next/image, next/navigation and next/dynamic. The Vite build
// rewrites those imports to this module (see nextToTanStack in the Grit
// scaffold) so the same components run under TanStack Router with no source
// changes. The Next.js admin keeps using the real next/* modules.
import * as React from "react";
import {
  Link as RouterLink,
  useNavigate,
  useRouterState,
  useParams as useRouterParams,
} from "@tanstack/react-router";

// RouterLink is heavily generic over the typed route tree; the shared components
// pass dynamic string hrefs, so we present a loosely-typed Link.
const AnyLink = RouterLink as unknown as React.ComponentType<
  { to: string; children?: React.ReactNode } & Record<string, unknown>
>;

// next/link: <Link href="..."> -> TanStack <Link to="...">.
export function Link({
  href,
  children,
  ...props
}: { href: string; children?: React.ReactNode } & Record<string, unknown>) {
  return (
    <AnyLink to={href} {...props}>
      {children}
    </AnyLink>
  );
}

type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | { src: string };
  priority?: boolean;
  fill?: boolean;
  quality?: number | string;
  placeholder?: string;
  loader?: unknown;
  unoptimized?: boolean;
};

// next/image: <Image src alt width height .../> -> a plain <img>. Next-only
// props (width/height/priority/fill/quality/placeholder/loader/sizes) are
// dropped; src may be a string or a static-import object ({ src }).
export function Image({
  src,
  alt,
  width,
  height,
  priority,
  fill,
  quality,
  placeholder,
  loader,
  sizes,
  unoptimized,
  ...rest
}: ImageProps) {
  const resolved = typeof src === "string" ? src : src?.src;
  return <img src={resolved} alt={alt ?? ""} {...rest} />;
}

// next/navigation: useRouter().push/replace -> TanStack navigate.
export function useRouter() {
  const navigate = useNavigate();
  return {
    // The options bag is accepted and ignored. Next.js callers pass
    // { scroll: false } when updating the address bar for a filter change;
    // TanStack does not scroll on navigate anyway, so the behaviour matches.
    // Without this parameter those call sites are a type error in the Vite
    // admin while compiling fine in the Next.js one.
    push: (to: string, _options?: { scroll?: boolean }) => navigate({ to: to as string }),
    replace: (to: string, _options?: { scroll?: boolean }) =>
      navigate({ to: to as string, replace: true }),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => {},
    prefetch: () => {},
  };
}

// next/navigation: usePathname().
export function usePathname(): string {
  return useRouterState({ select: (s) => s.location.pathname });
}

// next/navigation: useParams(). Non-strict so it resolves against whatever
// route is active, matching Next.js's untyped-by-default behaviour. Detail
// pages read params.id — TanStack names the segment $id, which yields the
// same { id } shape.
export function useParams<T = Record<string, string>>(): T {
  // Non-strict params are a union over every route; the caller names the shape.
  return useRouterParams({ strict: false }) as unknown as T;
}

export type ReadonlyURLSearchParams = URLSearchParams;

// next/navigation: useSearchParams() -> a URLSearchParams over the current query
// string. Read-only usage (.get/.has/.getAll) works exactly as on the web.
export function useSearchParams(): ReadonlyURLSearchParams {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr ?? "" });
  return new URLSearchParams(searchStr);
}

// next/dynamic(loader, { ssr:false }) -> React.lazy (Vite has no SSR, so the
// ssr flag is a no-op). Supports both { default: C } and bare-component loaders.
// biome-ignore lint/suspicious/noExplicitAny: React.lazy constrains its component the same way.
export function dynamic<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T } | T>,
  _options?: { ssr?: boolean; loading?: React.ComponentType },
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const mod = await loader();
    const lazyDefault = (mod as { default?: T }).default;
    return { default: lazyDefault ?? (mod as T) };
  });
}
