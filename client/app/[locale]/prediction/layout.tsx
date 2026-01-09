
import type { Metadata } from "next";
import { AssetPriceProvider } from "@/app/providers/AssetPriceProvider";

export const metadata: Metadata = {
  title: "CFT.live - Prediction",
  description: "Bet on asset price movements with other users",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AssetPriceProvider>{children}</AssetPriceProvider>
}
