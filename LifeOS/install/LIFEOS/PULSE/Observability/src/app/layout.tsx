import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import AppHeader from "@/components/AppHeader";
import ObserverScope from "@/components/ObserverScope";
import SecurityBanner from "@/components/SecurityBanner";
import { observerScopeScript } from "@/lib/observer";
import CommandPalette from "@/components/palette/CommandPalette";
import TemplateOnboarding from "@/components/TemplateOnboarding";
import { Providers } from "./providers";
import "./globals.css";
import "./telos/_v7/styles.css";

export const metadata: Metadata = {
  title: "Pulse | Home",
  description: "LifeOS Observability Dashboard",
  icons: {
    icon: "/lifeos-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Pre-paint: applies observer class + route scope before first render so
            a reload with observer on never flashes personal data. */}
        <script dangerouslySetInnerHTML={{ __html: observerScopeScript() }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <Providers>
          <SecurityBanner />
          <AppHeader />
          <ObserverScope />
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
