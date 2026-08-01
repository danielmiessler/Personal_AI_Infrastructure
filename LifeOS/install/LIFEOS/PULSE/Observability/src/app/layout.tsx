import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import AppHeader from "@/components/AppHeader";
import SecurityBanner from "@/components/SecurityBanner";
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
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <Providers>
          <SecurityBanner />
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
