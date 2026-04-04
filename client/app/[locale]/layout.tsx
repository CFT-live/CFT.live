import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { headers } from "next/headers";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Github } from "lucide-react";

import { ContextProvider } from "@/app/context";
import Providers from "@/app/providers/Providers";
import ConnectButton from "@/app/features/root/v1/components/ConnectButton";
import LanguageSwitcher from "@/app/features/root/v1/components/LanguageSwitcher";
import { Breadcrumb } from "@/app/features/root/v1/components/Breadcrumb";
import { Locale, Link } from "@/i18n/routing";

import "@/app/globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const XLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cft.live"),
  title: {
    default: "CFT.live - Web3 Smart Contract Hub",
    template: "%s | CFT.live",
  },
  description:
    "Open smart contract hub for safe Web3 interactions. Explore and interact with verified protocols on Arbitrum One.",
  applicationName: "CFT.live",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icon.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/images/icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    shortcut: [
      {
        url: "/icon.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
  },
  keywords: [
    "crypto",
    "smart contracts",
    "web3",
    "blockchain",
    "defi",
    "arbitrum",
    "protocols",
    "contract hub",
    "cft",
    "cft.live",
  ],
  openGraph: {
    title: "CFT.live - Web3 Smart Contract Hub",
    description:
      "Open smart contract hub for safe Web3 interactions. Explore and interact with verified protocols on Arbitrum One.",
    url: "https://www.cft.live",
    siteName: "CFT.live",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/icon-512.png",
        width: 512,
        height: 512,
        alt: "CFT.live",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CFT.live - Web3 Smart Contract Hub",
    description:
      "Open smart contract hub for safe Web3 interactions. Explore and interact with verified protocols on Arbitrum One.",
    creator: "@cftlive",
    site: "@cftlive",
    images: ["/images/icon-512.png"],
  },
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");

  const messages = await getMessages();
  const locale = (await params).locale;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className="custom-scrollbar crt-overlay">
      <body className={`${ibmPlexMono.variable} antialiased`}>
        <ContextProvider cookies={cookies}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>
            <div className="flex flex-col min-h-screen">
              <header className="border-b border-primary/20 bg-background/95 backdrop-blur-md sticky top-0 z-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)]">
                <div className="container mx-auto px-4 py-3 md:py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
                    {/* Logo and FAQ Row (Mobile) */}
                    <div className="flex items-center justify-between w-full md:w-auto">
                      <Link
                        href={"/"}
                        className="flex items-center gap-2 md:gap-3 group relative py-1 no-underline"
                        style={{ textDecoration: "none" }}
                      >
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-primary rounded-sm shadow-[0_0_8px_hsl(var(--primary)/0.6)] group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.8)] transition-all duration-300" />
                        <span className="text-base md:text-xl font-bold font-mono uppercase tracking-[0.15em] md:tracking-[0.2em] text-foreground  group-hover:text-primary transition-all duration-300">
                          CFT.LIVE
                        </span>
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
                      </Link>

                      {/* Mobile actions (FAQ + Language) */}
                      <div className="md:hidden flex items-center gap-2">
                        <Link
                          href={"/faq"}
                          className="text-xs font-mono font-medium text-muted-foreground hover:text-primary border border-border/50 hover:border-primary/50 px-2.5 py-1.5 rounded transition-all duration-200"
                        >
                          FAQ
                        </Link>
                        <LanguageSwitcher
                          size="sm"
                          className="text-xs font-mono font-medium tracking-wider"
                        />
                      </div>
                    </div>

                    {/* Mobile Connect Button Row */}
                    <div className="md:hidden w-full flex justify-end">
                      <ConnectButton />
                    </div>

                    {/* Desktop Nav */}
                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8">
                      {/* Desktop Only Actions */}
                      <div className="hidden md:flex items-center gap-6">
                        <Link
                          href={"/faq"}
                          className="text-sm font-mono font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors relative group py-1"
                          style={{ textDecoration: "none" }}
                        >
                          <span>FAQ</span>
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full no-underline" />
                        </Link>
                        <LanguageSwitcher
                          size="sm"
                          className="text-sm font-mono font-medium uppercase tracking-wider"
                        />
                        <div className="shrink-0">
                          <ConnectButton />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </header>
              <Breadcrumb />
              <main className="flex-1">
                {children}
              </main>
              <footer className="border-t border-border bg-background py-6 pb-24 md:pb-6">
                <div className="container mx-auto px-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <a
                        href="https://github.com/CFT-live/CFT.live"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center gap-2 group"
                        aria-label="GitHub"
                      >
                        <Github className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                        <span className="text-xs font-mono uppercase tracking-wider hidden sm:inline">
                          GitHub
                        </span>
                      </a>
                      <a
                        href="https://x.com/cftlive"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center gap-2 group"
                        aria-label="X"
                      >
                        <XLogo className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                        <span className="text-xs font-mono uppercase tracking-wider hidden sm:inline">
                          X
                        </span>
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      © 2026 CFT.LIVE. All lives reserved.
                    </p>
                  </div>
                </div>
              </footer>
            </div>
            </Providers>
          </NextIntlClientProvider>
        </ContextProvider>
      </body>
    </html>
  );
}
