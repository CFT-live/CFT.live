import {routing} from '@/i18n/routing';
import {formats} from '@/i18n/request';

type HomeMessages = typeof import("./messages/en/home.json");
type PredictionMessages = typeof import("./messages/en/prediction.json");
type RouletteMessages = typeof import("./messages/en/roulette.json");
type LottoMessages = typeof import("./messages/en/lotto.json");
type RedeemMessages = typeof import("./messages/en/redeem.json");
type RevokeMessages = typeof import("./messages/en/revoke.json");

type Messages = HomeMessages & PredictionMessages & RouletteMessages & LottoMessages & RedeemMessages & RevokeMessages;

type IMessage<Namespace extends keyof Messages> = keyof Messages[Namespace];

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: Messages;
    Formats: typeof formats;
  }
}