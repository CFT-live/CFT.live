"use client";

import { useState, useCallback, useEffect, createContext } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { Asset } from "../types";

const ASSET_MAP: Record<Asset, string> = {
  BNB: "bnbusdc",
  ARB: "arbusdc",
  ETH: "ethusdc",
  BTC: "btcusdc",
  SOL: "solusdc",
  XRP: "xrpusdc",
  AAVE: "aaveusdc",
  DOGE: "dogeusdc",
  PEPE: "pepeusdc",
  SHIB: "shibusdc",
};

const COINGECKO_ID_MAP: Record<Asset, string> = {
  BNB: "binancecoin",
  ARB: "arbitrum",
  ETH: "ethereum",
  BTC: "bitcoin",
  SOL: "solana",
  XRP: "ripple",
  AAVE: "aave",
  DOGE: "dogecoin",
  PEPE: "pepe",
  SHIB: "shiba-inu",
};

const COINGECKO_STALE_THRESHOLD_MS = 30000;

export type PriceData = {
  coin: Asset;
  date: string;
  price: number;
  priceString: string;
  lastPrice?: number;
};

export type MultiAssetPriceData = Record<Asset, PriceData>;

const EMPTY_MULTI_ASSET_DATA: MultiAssetPriceData = {} as MultiAssetPriceData;
export const MultiAssetPriceContext = createContext<MultiAssetPriceData>(
  EMPTY_MULTI_ASSET_DATA,
);

export const AssetPriceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [prices, setPrices] = useState<MultiAssetPriceData>(
    EMPTY_MULTI_ASSET_DATA,
  );

  const updateCoinPrice = useCallback((coin: string, newData: PriceData) => {
    setPrices((prevPrices) => ({
      ...prevPrices,
      [coin]: newData,
    }));
  }, []);

  useEffect(() => {
    const wsManager = CoinWebSocketManager.getInstance();
    const unsubscribeFunctions: (() => void)[] = [];

    // Subscribe to updates for all coins
    Object.keys(ASSET_MAP).forEach((coin) => {
      const unsubscribe = wsManager.subscribe(
        coin as Asset,
        (newData: PriceData) => {
          updateCoinPrice(coin, newData);
        },
      );
      unsubscribeFunctions.push(unsubscribe);
    });

    // Clean up all subscriptions when the component unmounts
    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  }, [updateCoinPrice]);

  return (
    <MultiAssetPriceContext.Provider value={prices}>
      {children}
    </MultiAssetPriceContext.Provider>
  );
};

class CoinWebSocketManager {
  private static instance: CoinWebSocketManager;
  private ws: ReconnectingWebSocket | null = null;
  private readonly subscribers: Map<Asset, Set<(data: PriceData) => void>> =
    new Map();
  private readonly prices: Map<Asset, PriceData> = new Map();
  private readonly lastUpdated: Map<Asset, number> = new Map();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  static getInstance(): CoinWebSocketManager {
    if (!CoinWebSocketManager.instance) {
      CoinWebSocketManager.instance = new CoinWebSocketManager();
    }
    return CoinWebSocketManager.instance;
  }

  private constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    // Combine all streams into a single WebSocket connection
    const streams = Object.values(ASSET_MAP)
      .map((symbol) => `${symbol}@kline_1s`)
      .join("/");
    this.ws = new ReconnectingWebSocket(
      `wss://stream.binance.com:9443/ws/${streams}`,
    );
    this.startFallbackPolling();

    this.ws.onopen = () => {};

    this.ws.onclose = () => {};

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);

        // Find which coin this stream belongs to
        const symbol = message.s.toLowerCase(); // Get symbol from the message (e.g., "XRPUSDC" -> "xrpusdc")
        const coin = Object.entries(ASSET_MAP).find(
          ([, value]) => value === symbol,
        )?.[0] as Asset;

        if (coin) {
          const newPrice = Number.parseFloat(message.k.c);
          const lastPrice = this.prices.get(coin)?.price;

          const newData: PriceData = {
            coin,
            date: new Date(message.E).toISOString(),
            price: newPrice,
            priceString: `${newPrice}`,
            lastPrice,
          };

          this.prices.set(coin, newData);
          this.lastUpdated.set(coin, Date.now());

          // Notify all subscribers for this specific coin
          const coinSubscribers = this.subscribers.get(coin);
          if (coinSubscribers) {
            coinSubscribers.forEach((callback) => callback(newData));
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message", error);
      }
    };
  }

  private startFallbackPolling() {
    if (this.pollingInterval) return;
    this.pollCoinGecko();
    this.pollingInterval = setInterval(() => this.pollCoinGecko(), COINGECKO_STALE_THRESHOLD_MS);
  }

  private async pollCoinGecko() {
    const now = Date.now();
    const staleAssets = (Object.keys(ASSET_MAP) as Asset[]).filter((coin) => {
      const lastUpdate = this.lastUpdated.get(coin);
      return !lastUpdate || now - lastUpdate > COINGECKO_STALE_THRESHOLD_MS;
    });

    if (staleAssets.length === 0) return;

    const ids = staleAssets.map((coin) => COINGECKO_ID_MAP[coin]).join(",");
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      );
      const data: Record<string, { usd: number }> = await response.json();

      staleAssets.forEach((coin) => {
        const geckoId = COINGECKO_ID_MAP[coin];
        if (data[geckoId]?.usd) {
          const newPrice = data[geckoId].usd;
          const lastPrice = this.prices.get(coin)?.price;
          this.lastUpdated.set(coin, now);

          if (lastPrice !== newPrice) {
            const newData: PriceData = {
              coin,
              date: new Date().toISOString(),
              price: newPrice,
              priceString: `${newPrice}`,
              lastPrice,
            };
            this.prices.set(coin, newData);
            const coinSubscribers = this.subscribers.get(coin);
            if (coinSubscribers) {
              coinSubscribers.forEach((callback) => callback(newData));
            }
          }
        }
      });
    } catch (error) {
      console.error("Error fetching CoinGecko prices", error);
    }
  }

  subscribe(coin: Asset, callback: (data: PriceData) => void): () => void {
    if (!this.subscribers.has(coin)) {
      this.subscribers.set(coin, new Set());
    }

    this.subscribers.get(coin)!.add(callback);

    // If we already have data for this coin, send it immediately
    const existingData = this.prices.get(coin);
    if (existingData) {
      callback(existingData);
    }

    // Return unsubscribe function
    return () => {
      const coinSubscribers = this.subscribers.get(coin);
      if (coinSubscribers) {
        coinSubscribers.delete(callback);
        if (coinSubscribers.size === 0) {
          this.subscribers.delete(coin);
        }
      }
    };
  }

  cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.subscribers.clear();
    this.prices.clear();
    this.lastUpdated.clear();
  }
}
