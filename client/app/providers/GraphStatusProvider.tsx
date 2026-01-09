"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { request } from "graphql-request";
import { useQueryClient } from "@tanstack/react-query";
import { getMetadata } from "@/app/queries/shared";
import { DEFAULT_HEADERS } from "@/app/queries/headers";
import {
  // Prediction query keys
  CONTRACT_BALANCE_QUERY_KEY,
  OPEN_ROUNDS_QUERY_KEY,
  CLOSED_ROUNDS_QUERY_KEY,
  LIVE_ROUNDS_QUERY_KEY,
  CONTRACT_METADATA_QUERY_KEY,
  CONTRACT_PRICE_FEEDS_QUERY_KEY,
  USER_BETS_QUERY_KEY,
  // Lotto query keys
  LOTTO_OPEN_DRAWS_QUERY_KEY,
  LOTTO_CLOSED_DRAWS_QUERY_KEY,
  LOTTO_WINNER_DRAWS_QUERY_KEY,
  LOTTO_CONTRACT_METADATA_QUERY_KEY,
  LOTTO_USER_TICKETS_QUERY_KEY,
  // Roulette query keys
  ROULETTE_OPEN_TABLES_QUERY_KEY,
  ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY,
  ROULETTE_FINISHED_TABLES_QUERY_KEY,
  ROULETTE_USER_ACTIVE_TABLES_QUERY_KEY,
  ROULETTE_CONTRACT_METADATA_QUERY_KEY,
  ROULETTE_GLOBAL_STATS_QUERY_KEY,
  ROULETTE_TABLE_DETAIL_QUERY_KEY,
} from "@/app/queries/keys";

type GraphType = "prediction" | "lotto" | "roulette";

// Query keys grouped by graph type for invalidation
const QUERY_KEYS_BY_GRAPH_TYPE: Record<GraphType, string[]> = {
  prediction: [
    CONTRACT_BALANCE_QUERY_KEY,
    OPEN_ROUNDS_QUERY_KEY,
    CLOSED_ROUNDS_QUERY_KEY,
    LIVE_ROUNDS_QUERY_KEY,
    CONTRACT_METADATA_QUERY_KEY,
    CONTRACT_PRICE_FEEDS_QUERY_KEY,
    USER_BETS_QUERY_KEY,
  ],
  lotto: [
    LOTTO_OPEN_DRAWS_QUERY_KEY,
    LOTTO_CLOSED_DRAWS_QUERY_KEY,
    LOTTO_WINNER_DRAWS_QUERY_KEY,
    LOTTO_CONTRACT_METADATA_QUERY_KEY,
    LOTTO_USER_TICKETS_QUERY_KEY,
  ],
  roulette: [
    ROULETTE_OPEN_TABLES_QUERY_KEY,
    ROULETTE_IN_PROGRESS_TABLES_QUERY_KEY,
    ROULETTE_FINISHED_TABLES_QUERY_KEY,
    ROULETTE_USER_ACTIVE_TABLES_QUERY_KEY,
    ROULETTE_CONTRACT_METADATA_QUERY_KEY,
    ROULETTE_GLOBAL_STATS_QUERY_KEY,
    ROULETTE_TABLE_DETAIL_QUERY_KEY,
  ],
};

interface GraphStatusContextType {
  /**
   * Report a successful transaction block number to show the sync overlay
   * @param blockNumber - The block number from the transaction receipt
   * @param graphType - Which graph to poll for sync status
   */
  reportTransactionBlock: (blockNumber: bigint, graphType: GraphType) => void;
}

const GraphStatusContext = createContext<GraphStatusContextType | null>(null);

interface MetadataResponse {
  _meta: {
    block: {
      number: number;
      hash: string;
      timestamp: number;
      parentHash: string;
    };
  };
}

const GRAPH_URLS: Record<GraphType, string> = {
  prediction: process.env.NEXT_PUBLIC_THE_GRAPH_API_URL!,
  lotto: process.env.NEXT_PUBLIC_LOTTO_THE_GRAPH_API_URL!,
  roulette: process.env.NEXT_PUBLIC_ROULETTE_THE_GRAPH_API_URL!,
};

const POLL_INTERVAL = 2000; // 2 seconds

export function GraphStatusProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = useQueryClient();
  const [pendingBlock, setPendingBlock] = useState<bigint | null>(null);
  const [currentGraphBlock, setCurrentGraphBlock] = useState<number | null>(
    null
  );
  const [graphType, setGraphType] = useState<GraphType | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Bubble position state - starts at bottom left
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasDragged = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  const reportTransactionBlock = useCallback(
    (blockNumber: bigint, type: GraphType) => {
      setPendingBlock(blockNumber);
      setGraphType(type);
      setCurrentGraphBlock(null);
      setIsVisible(true);
      setIsMinimized(false);
    },
    []
  );

  // Handle mouse down for dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!bubbleRef.current) return;
      setIsDragging(true);
      hasDragged.current = false;
      const rect = bubbleRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      e.preventDefault();
    },
    []
  );

  // Handle double click to expand
  const handleDoubleClick = useCallback(() => {
    if (!hasDragged.current) {
      setIsMinimized(false);
    }
  }, []);

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      hasDragged.current = true;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // Keep bubble within viewport bounds
      const bubbleWidth = bubbleRef.current?.offsetWidth ?? 60;
      const bubbleHeight = bubbleRef.current?.offsetHeight ?? 60;
      const maxX = window.innerWidth - bubbleWidth;
      const maxY = window.innerHeight - bubbleHeight;

      setBubblePosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Invalidate all queries for a specific graph type
  const invalidateQueriesForGraphType = useCallback(
    (type: GraphType) => {
      const queryKeys = QUERY_KEYS_BY_GRAPH_TYPE[type];
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      console.log(`Invalidated ${queryKeys.length} queries for ${type}`);
    },
    [queryClient]
  );

  // Poll the graph for sync status
  useEffect(() => {
    if (!isVisible || !pendingBlock || !graphType) return;

    const fetchGraphBlock = async () => {
      try {
        const graphUrl = GRAPH_URLS[graphType];
        const response = await request<MetadataResponse>(
          graphUrl,
          getMetadata,
          {},
          DEFAULT_HEADERS
        );
        const graphBlock = response._meta.block.number;
        setCurrentGraphBlock(graphBlock);

        // Check if graph has caught up
        if (BigInt(graphBlock) >= pendingBlock) {
          // Invalidate queries for this graph type
          invalidateQueriesForGraphType(graphType);

          // Add a small delay before closing to show the "synced" state
          setTimeout(() => {
            setIsVisible(false);
            setPendingBlock(null);
            setGraphType(null);
            setCurrentGraphBlock(null);
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to fetch graph metadata:", error);
      }
    };

    // Initial fetch
    fetchGraphBlock();

    // Set up polling
    const interval = setInterval(fetchGraphBlock, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isVisible, pendingBlock, graphType, invalidateQueriesForGraphType]);

  const isSynced =
    currentGraphBlock !== null &&
    pendingBlock !== null &&
    BigInt(currentGraphBlock) >= pendingBlock;

  const contextValue = useMemo(
    () => ({ reportTransactionBlock }),
    [reportTransactionBlock]
  );

  return (
    <GraphStatusContext.Provider value={contextValue}>
      {children}

      {/* Minimized bubble view */}
      {isVisible && isMinimized && (
        <div
          ref={bubbleRef}
          className="fixed z-100 cursor-move select-none"
          style={{
            left: bubblePosition?.x ?? 20,
            top: bubblePosition?.y ?? (typeof window !== "undefined" ? window.innerHeight - 100 : 20),
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          <div className="relative group">
            {/* Spinning/synced indicator bubble with block info */}
            <div
              className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-lg transition-all ${
                isSynced
                  ? "bg-green-500/20 border-2 border-green-500"
                  : "bg-background border-2 border-primary"
              }`}
            >
              {isSynced ? (
                <svg
                  className="w-6 h-6 text-green-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin shrink-0" />
              )}
              <div className="text-xs font-mono">
                <span className={isSynced ? "text-green-500" : "text-yellow-500"}>
                  {currentGraphBlock ?? "..."}
                </span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-foreground">{pendingBlock?.toString()}</span>
              </div>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-background border border-border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap text-xs">
              <div className="text-foreground font-medium">
                {isSynced ? "Synced!" : "Syncing..."}
              </div>
              <div className="text-muted-foreground mt-1">
                Double-click to expand • Drag to move
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full modal view */}
      {isVisible && !isMinimized && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl relative">
            {/* Minimize button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Minimize to bubble"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              {/* Animated spinner or checkmark */}
              <div className="relative">
                {isSynced ? (
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                )}
              </div>

              {/* Title */}
              <div>
                <h2 className="text-xl font-bold text-foreground uppercase tracking-wider">
                  {isSynced ? "Data Synced" : "Syncing Data"}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {isSynced
                    ? "The graph has processed your transaction"
                    : "Waiting for the graph to process your transaction..."}
                </p>
              </div>

              {/* Block numbers display */}
              <div className="w-full space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                  <span className="text-muted-foreground">
                    Transaction Block:
                  </span>
                  <span className="text-foreground font-semibold">
                    {pendingBlock?.toString() ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                  <span className="text-muted-foreground">
                    Graph Current Block:
                  </span>
                  <span
                    className={`font-semibold ${isSynced ? "text-green-500" : "text-yellow-500"}`}
                  >
                    {currentGraphBlock ?? "Fetching..."}
                  </span>
                </div>
              </div>

              {/* Progress indicator */}
              {!isSynced && pendingBlock && currentGraphBlock && (
                <div className="w-full">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>
                      {Math.max(
                        0,
                        Number(pendingBlock) - currentGraphBlock
                      )}{" "}
                      blocks behind
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(100, (currentGraphBlock / Number(pendingBlock)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Minimize hint */}
              {!isSynced && (
                <p className="text-xs text-muted-foreground">
                  You can minimize this overlay and continue browsing
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </GraphStatusContext.Provider>
  );
}

export function useGraphStatus() {
  const context = useContext(GraphStatusContext);
  if (!context) {
    throw new Error("useGraphStatus must be used within a GraphStatusProvider");
  }
  return context;
}
