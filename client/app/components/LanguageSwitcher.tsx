"use client";

import * as React from "react";
import { useLocale } from "next-intl";

import { routing, type Locale, usePathname, useRouter } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LanguageSwitcher({
  size = "sm",
  className,
}: {
  size?: "sm" | "default";
  className?: string;
}) {
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const value = routing.locales.includes(currentLocale)
    ? currentLocale
    : routing.defaultLocale;

  return (
    <Select
      value={value}
      onValueChange={(nextLocale) => {
        const typedLocale = nextLocale as Locale;

        startTransition(() => {
          // Keep the user on the same page while changing the locale.
          router.replace(pathname ?? "/", { locale: typedLocale });
        });
      }}
      disabled={isPending}
    >
      <SelectTrigger
        size={size}
        aria-label="Change language"
        className={className}
      >
        <SelectValue placeholder="LANG" />
      </SelectTrigger>
      <SelectContent align="end">
        {routing.locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {locale.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
