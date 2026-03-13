import { getRequestConfig } from "next-intl/server";
import { routing, Locale } from "./routing";
 
export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale as Locale | undefined;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale;
  }

  // Load messages more efficiently with error handling
  try {
    // Load critical messages first (home page)
    const homeMessages = (await import(`../messages/${locale}/home.json`)).default;
    
    // Load other message files with Promise.all for better performance
    const [predictionMessages, rouletteMessages, lottoMessages, redeemMessages] = await Promise.all([
      import(`../messages/${locale}/prediction.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/roulette.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/lotto.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/redeem.json`).then(m => m.default).catch(() => ({})),
    ]);

    return {
      locale,
      messages: {
        ...homeMessages,
        ...predictionMessages,
        ...rouletteMessages,
        ...lottoMessages,
        ...redeemMessages,
      },
    };
  } catch (error) {
    console.warn(`Failed to load messages for locale ${locale}:`, error);
    
    // Fallback to default locale if current locale fails
    if (locale !== routing.defaultLocale) {
      try {
        const fallbackMessages = (await import(`../messages/${routing.defaultLocale}/home.json`)).default;
        return {
          locale: routing.defaultLocale,
          messages: fallbackMessages,
        };
      } catch (fallbackError) {
        console.error("Failed to load fallback messages:", fallbackError);
      }
    }
    
    return {
      locale,
      messages: {},
    };
  }
});