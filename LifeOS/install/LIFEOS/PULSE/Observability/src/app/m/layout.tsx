import MobileShell from "@/components/mobile/MobileShell";

/**
 * The mobile plane. Nests inside the root layout, which is why AppHeader
 * carries a single early-return for `/m` — the desktop header and this shell
 * are two chromes for one app, never both at once.
 */
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
