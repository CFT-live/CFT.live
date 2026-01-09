import {createNavigation} from 'next-intl/navigation';
import { defineRouting } from "next-intl/routing";
import NextLink from "next/link";

export const routing = defineRouting({
  locales: ["en", "de", "fr", "pt", "ru", "zh", "es", "ar", "id", "ja"],
  defaultLocale: "en",
  pathnames: {},
});
 
export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];
 
const { Link: IntlLink, permanentRedirect, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

export const Link = IntlLink as typeof NextLink;
export { permanentRedirect, redirect, usePathname, useRouter, getPathname };