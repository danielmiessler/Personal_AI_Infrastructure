import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import AppHeader from "@/components/AppHeader";
import CommandPalette from "@/components/palette/CommandPalette";
import TemplateOnboarding from "@/components/TemplateOnboarding";
import MobileRedirect from "@/components/mobile/MobileRedirect";
import { Providers } from "./providers";
import "./globals.css";
import "./telos/_v7/styles.css";
import "@/components/mobile/mobile.css";

export const metadata: Metadata = {
  title: "Pulse | Home",
  description: "LifeOS Observability Dashboard",
  icons: {
    icon: "/lifeos-logo.svg",
  },
};

// viewportFit:"cover" is what makes env(safe-area-inset-bottom) non-zero, so
// the mobile thumb bar clears the home indicator on a notched phone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#060B1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <Providers>
          <MobileRedirect />
          <AppHeader />
          <CommandPalette />
          <TemplateOnboarding />
          <main className="min-h-screen max-w-[1920px] mx-auto w-full overflow-x-hidden relative">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
