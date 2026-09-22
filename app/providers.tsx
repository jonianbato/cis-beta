"use client";

import type { ReactNode } from "react";
import ProviderStack from "./provider-stack";

export default function Providers({ children }: { children: ReactNode }) {
  return <ProviderStack>{children}</ProviderStack>;
}
