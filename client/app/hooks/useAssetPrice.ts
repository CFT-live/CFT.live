import { useContext } from "react";
import { MultiAssetPriceContext, PriceData } from "../providers/AssetPriceProvider";
import { Asset } from "../types";

export const useAssetPrice = (asset: Asset): PriceData | undefined => {
  const allPrices = useContext(MultiAssetPriceContext);
  return allPrices[asset];
};
