"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  NavigationProvider,
  type NavigationAdapter,
  type NavLinkProps,
} from "osp-ui-kit";

function NextNavLink({ to, ...rest }: NavLinkProps) {
  return <Link href={to} {...rest} />;
}

/**
 * Binds osp-ui-kit's router-agnostic NavigationProvider to the Next App
 * Router, so the shell's links drive Next's own file-based routes. This is the
 * Next counterpart to the kit's ReactRouterNavigationProvider.
 */
export default function NextNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const value = useMemo<NavigationAdapter>(
    () => ({
      pathname,
      navigate: (to, options) => {
        // The kit accepts react-router's numeric history idiom, e.g. -1.
        if (typeof to === "number") {
          if (to < 0) router.back();
          else router.forward();
          return;
        }
        if (options?.replace) router.replace(to);
        else router.push(to);
      },
      Link: NextNavLink,
    }),
    [pathname, router],
  );

  return <NavigationProvider value={value}>{children}</NavigationProvider>;
}
