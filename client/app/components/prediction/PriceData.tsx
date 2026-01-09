"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { Asset } from "../../types";
import { ASSET_ENUM } from "../../helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useAssetPrice } from "../../hooks/useAssetPrice";

export const PriceData = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    // TODO: Implement manual refresh logic
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Price Feeds</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(ASSET_ENUM).map((asset) => (
            <PriceFeed key={asset} asset={asset as Asset} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const PriceFeed = ({ asset }: { asset: Asset }) => {
  const priceData = useAssetPrice(asset);

  const getPriceColorClass = () => {
    if (
      priceData?.lastPrice === undefined ||
      priceData.price === priceData.lastPrice
    ) {
      return "text-gray-200";
    }
    return priceData.price > priceData.lastPrice
      ? "text-green-500"
      : "text-red-500";
  };

  return (
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground mb-1">{asset}</span>
      {priceData ? (
        <NumberFlow
          value={priceData.price}
          format={{
            style: "currency",
            currency: "USD",
            trailingZeroDisplay: "auto",
            maximumFractionDigits: 20,
          }}
          className={getPriceColorClass()}
          willChange
        />
      ) : (
        <div>...</div>
      )}
    </div>
  );
};
