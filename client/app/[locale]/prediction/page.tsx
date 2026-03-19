import { Metadata } from "next";
import PredictionPage from "@/app/features/prediction/v1/PredictionPage";
import { AssetPriceProvider } from "@/app/providers/AssetPriceProvider";

export const metadata: Metadata = {
  title: "CFT.live - Prediction",
  description: "Bet on asset price movements with other users",
};

export default function Page() {
  return (
    <AssetPriceProvider>
      <PredictionPage />
    </AssetPriceProvider>
  );
}
