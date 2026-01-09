import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Create middleware with performance optimizations
const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: true, // Disable automatic locale detection to speed up
  alternateLinks: true,  // Disable alternate links generation
});

export default intlMiddleware;

export const config = {
  // Run locale middleware only for application routes (not for public files like .png/.svg/.ico).
  matcher: [
    "/((?!api|_next|images|assets|favicon\\.ico|robots\\.txt|manifest\\.webmanifest|site\\.webmanifest|.*\\..*).*)",
  ],
};
 