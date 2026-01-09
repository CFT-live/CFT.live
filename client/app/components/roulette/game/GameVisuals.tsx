"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Table } from "@/app/queries/roulette.types";
import { cn } from "@/lib/utils";
import { Loader2, Skull } from "lucide-react";
import { useAppKitAccount } from "@reown/appkit/react";

type ChamberVisual = {
  stroke: string;
  strokeWidth: number;
  glowFilter: string | null;
  scale: number;
  labelFill: string;
};

type StatusMode = "waiting" | "result" | "idle" | "none";

type GameVisualState = {
  statusMode: StatusMode;
  playerName: string;
  isYou: boolean;
  isEliminated: boolean;
  isWaitingForServer: boolean;
  hasResult: boolean;
  targetRotation: number;
  playerRandom: number | null;
  serverRandom: number | null;
  playerPickDisplay: ReactNode;
  serverPickDisplay: ReactNode;
  serverPickClass: string;
};

const CHAMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type LastTurn = NonNullable<Table["turns"]>[number];

const parseOptionalInt = (value?: string | null): number | null => {
  return value ? Number.parseInt(value) : null;
};

const getStatusMode = (opts: {
  isWaitingForServer: boolean;
  hasResult: boolean;
  hasTurn: boolean;
}): StatusMode => {
  if (opts.isWaitingForServer) return "waiting";
  if (opts.hasResult) return "result";
  if (!opts.hasTurn) return "idle";
  return "none";
};

const getPlayerDisplayName = (
  turn: LastTurn | null,
  address: string | undefined,
  youLabel: string
): { name: string; isYou: boolean } => {
  if (!turn) return { name: "-", isYou: false };

  const id = turn.player.id;
  const isYou = Boolean(address) && id.toLowerCase() === address!.toLowerCase();

  if (isYou) return { name: youLabel, isYou: true };

  return { name: id.slice(0, 6) + "..." + id.slice(-4), isYou: false };
};

const getServerPickDisplay = (
  serverRandom: number | null,
  isWaitingForServer: boolean
): ReactNode => {
  if (serverRandom != null) return serverRandom;
  if (isWaitingForServer) {
    return <Loader2 className="w-4 h-4 animate-spin opacity-60" />;
  }
  return "-";
};

const getServerPickClass = (hasResult: boolean, isEliminated: boolean): string => {
  if (!hasResult) return "text-zinc-500";
  return isEliminated ? "text-red-400" : "text-emerald-300";
};

const getChamberVisual = (opts: {
  num: number;
  playerRandom: number | null;
  serverRandom: number | null;
  hasResult: boolean;
}): ChamberVisual => {
  const isPlayerChoice = opts.playerRandom === opts.num;
  const isServerChoice = opts.serverRandom === opts.num;

  let stroke = "rgba(113,113,122,0.55)"; // zinc-500-ish
  let strokeWidth = 1.5;
  let glowFilter: string | null = null;
  let scale = 1;
  let labelFill = "rgba(113,113,122,0.85)";

  if (isPlayerChoice) {
    stroke = "rgba(249,115,22,0.85)"; // orange-500
    strokeWidth = 2.25;
    labelFill = "rgba(253,186,116,0.95)"; // orange-300
  }

  if (opts.hasResult && isServerChoice) {
    scale = 1.05;
    if (isPlayerChoice) {
      stroke = "rgba(239,68,68,0.95)"; // red-500
      strokeWidth = 2.5;
      labelFill = "rgba(254,202,202,0.95)"; // red-200
      glowFilter = "url(#glowRed)";
    } else {
      stroke = "rgba(16,185,129,0.9)"; // emerald-500
      strokeWidth = 2.5;
      labelFill = "rgba(167,243,208,0.95)"; // emerald-200
      glowFilter = "url(#glowGreen)";
    }
  }

  return { stroke, strokeWidth, glowFilter, scale, labelFill };
};

const deriveGameVisualState = (
  table: Table,
  address: string | undefined,
  youLabel: string
): GameVisualState => {
  const lastTurn = table.turns?.at(-1) ?? null;

  const playerRandom = parseOptionalInt(lastTurn?.playerRandom);
  const serverRandom = parseOptionalInt(lastTurn?.serverRandom);

  const isWaitingForServer = playerRandom != null && serverRandom == null;
  const hasResult = playerRandom != null && serverRandom != null;
  const isEliminated = hasResult && playerRandom === serverRandom;

  const { name: playerName, isYou } = getPlayerDisplayName(
    lastTurn,
    address,
    youLabel
  );
  const targetRotation = serverRandom == null ? 0 : -serverRandom * 36;

  const statusMode = getStatusMode({
    isWaitingForServer,
    hasResult,
    hasTurn: Boolean(lastTurn),
  });

  const playerPickDisplay: ReactNode = playerRandom ?? "-";
  const serverPickDisplay = getServerPickDisplay(serverRandom, isWaitingForServer);
  const serverPickClass = getServerPickClass(hasResult, isEliminated);

  return {
    statusMode,
    playerName,
    isYou,
    isEliminated,
    isWaitingForServer,
    hasResult,
    targetRotation,
    playerRandom,
    serverRandom,
    playerPickDisplay,
    serverPickDisplay,
    serverPickClass,
  };
};

const GameVisualsView = (props: GameVisualState) => {
  const {
    statusMode,
    playerName,
    isYou,
    isEliminated,
    isWaitingForServer,
    hasResult,
    targetRotation,
    playerRandom,
    serverRandom,
    playerPickDisplay,
    serverPickDisplay,
    serverPickClass,
  } = props;

  const t = useTranslations("roulette");

  let resultMessage = "";
  if (statusMode === "result") {
    if (isEliminated) {
      resultMessage = isYou
        ? t("visuals_you_eliminated")
        : t("visuals_player_eliminated", { player: playerName });
    } else {
      resultMessage = isYou
        ? t("visuals_you_survived")
        : t("visuals_player_survived", { player: playerName });
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Status */}
      <div className="mb-4 min-h-12 flex items-center justify-center w-full">
        <AnimatePresence mode="wait">
          {statusMode === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-yellow-500"
            >
              <div className="flex items-center gap-2 text-lg sm:text-xl font-bold uppercase tracking-widest">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t("visuals_spinning")}</span>
              </div>
              <p className="text-sm text-yellow-500/70 font-medium mt-1">
                {t("visuals_waiting_for_server")}
              </p>
            </motion.div>
          )}

          {statusMode === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex flex-col items-center",
                isEliminated ? "text-red-500" : "text-green-500"
              )}
            >
              <div className="text-3xl sm:text-4xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-lg">
                {isEliminated ? (
                  <>
                    <Skull className="w-9 h-9 sm:w-10 sm:h-10" />
                    <span>{t("visuals_bang")}</span>
                    <Skull className="w-9 h-9 sm:w-10 sm:h-10" />
                  </>
                ) : (
                  <span>{t("visuals_click")}</span>
                )}
              </div>
              <p className="text-sm sm:text-base font-medium opacity-90 mt-1">
                {resultMessage}
              </p>
            </motion.div>
          )}

          {statusMode === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground font-medium text-sm sm:text-base"
            >
              {t("visuals_waiting_for_game_start")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cylinder Visual */}
      <div className="relative w-full max-w-[360px] sm:max-w-[420px] aspect-square">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          {(() => {
            const CENTER = 50;
            const OUTER_R = 48;
            const CYL_R = 37;
            const TICK_IN = CYL_R - 2.4;
            const TICK_OUT = CYL_R - 0.7;
            const CHAMBER_CENTER_R = 26.2;
            const CHAMBER_OUTER_R = 7.2;
            const CHAMBER_HOLE_R = 5.6;
            const CHAMBER_CORE_R = 3;
            const LABEL_Y_OFFSET = 0;

            return (
              <>
          <defs>
            <radialGradient id="metalOuter" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#111827" />
              <stop offset="45%" stopColor="#05070b" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            <radialGradient id="metalInner" cx="45%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#2a2a2f" />
              <stop offset="55%" stopColor="#131318" />
              <stop offset="100%" stopColor="#07070a" />
            </radialGradient>
            <radialGradient id="hub" cx="45%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#3a3a44" />
              <stop offset="60%" stopColor="#1c1c23" />
              <stop offset="100%" stopColor="#0b0b10" />
            </radialGradient>
            <radialGradient id="hole" cx="45%" cy="35%" r="80%">
              <stop offset="0%" stopColor="#0b0b0f" />
              <stop offset="55%" stopColor="#000000" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.6" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 0.2 0 0 0  0 0 0.2 0 0  0 0 0 0.9 0"
                result="colored"
              />
              <feMerge>
                <feMergeNode in="colored" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="0.2 0 0 0 0  0 1 0 0 0  0 0 0.3 0 0  0 0 0 0.8 0"
                result="colored"
              />
              <feMerge>
                <feMergeNode in="colored" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bullet base materials */}
            <radialGradient id="bulletBrass" cx="40%" cy="35%" r="80%">
              <stop offset="0%" stopColor="#f5d77a" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#d6a84a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7a5520" stopOpacity="0.95" />
            </radialGradient>
            <radialGradient id="bulletPrimer" cx="45%" cy="35%" r="85%">
              <stop offset="0%" stopColor="#1f2937" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#0b1220" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#02040a" stopOpacity="0.95" />
            </radialGradient>
            <filter id="bulletGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="0.9" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 0.6 0 0 0  0 0 0.15 0 0  0 0 0 0.6 0"
                result="colored"
              />
              <feMerge>
                <feMergeNode in="colored" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer shell */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_R}
            fill="url(#metalOuter)"
            stroke="#3f3f46"
            strokeOpacity="0.65"
            strokeWidth="0.9"
          />

          {/* Rotating cylinder group */}
          <motion.g
            style={{ transformOrigin: "50% 50%", transformBox: "view-box" }}
            animate={isWaitingForServer ? { rotate: 360 } : { rotate: targetRotation }}
            transition={
              isWaitingForServer
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : { type: "spring", stiffness: 40, damping: 15, mass: 1 }
            }
          >
            <circle
              cx={CENTER}
              cy={CENTER}
              r={CYL_R}
              fill="url(#metalInner)"
              stroke="#52525b"
              strokeOpacity="0.35"
              strokeWidth="0.8"
            />

            {/* Machining ticks */}
            {Array.from({ length: 20 }).map((_, i) => {
              const a = (i * 360) / 20;
              const rad = ((a - 90) * Math.PI) / 180;
              const x1 = CENTER + Math.cos(rad) * TICK_IN;
              const y1 = CENTER + Math.sin(rad) * TICK_IN;
              const x2 = CENTER + Math.cos(rad) * TICK_OUT;
              const y2 = CENTER + Math.sin(rad) * TICK_OUT;
              return (
                <line
                  key={`tick-${a}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#ffffff"
                  strokeOpacity={0.03}
                  strokeWidth={0.5}
                />
              );
            })}

            {/* Chambers */}
            {CHAMBERS.map((num, index) => {
              const angle = (index * 360) / 10;
              const rad = ((angle - 90) * Math.PI) / 180;
              const cx = CENTER + Math.cos(rad) * CHAMBER_CENTER_R;
              const cy = CENTER + Math.sin(rad) * CHAMBER_CENTER_R;

              const { stroke, strokeWidth, glowFilter, scale, labelFill } = getChamberVisual({
                num,
                playerRandom,
                serverRandom,
                hasResult,
              });

              const isPlayerChoice = playerRandom === num;
              const isBulletHit = hasResult && isPlayerChoice && serverRandom === num;
              const gTransform = `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;
              // Keep labels upright once the wheel stops by counter-rotating them.
              // (During the "waiting" spin we don't have a deterministic final rotation to cancel.)
              const labelTransform =
                hasResult && serverRandom != null
                  ? `rotate(${serverRandom * 36} ${cx} ${cy})`
                  : undefined;

              return (
                <g key={num} transform={gTransform} filter={glowFilter ?? undefined}>
                  {/* Outer ring */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={CHAMBER_OUTER_R}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                  {/* Hole */}
                  <circle cx={cx} cy={cy} r={CHAMBER_HOLE_R} fill="url(#hole)" />
                  <circle cx={cx} cy={cy} r={CHAMBER_CORE_R} fill="#000000" fillOpacity={0.95} />

                  {/* Player "bullet" (base view) */}
                  {isPlayerChoice && (
                    <motion.g
                      filter={isWaitingForServer ? "url(#bulletGlow)" : undefined}
                      animate={
                        isWaitingForServer
                          ? { opacity: [0.95, 0.7, 0.95] }
                          : { opacity: 1 }
                      }
                      transition={
                        isWaitingForServer
                          ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                          : undefined
                      }
                    >
                      {/* Rim */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={CHAMBER_HOLE_R - 0.9}
                        fill="url(#bulletBrass)"
                        opacity={hasResult && !isBulletHit ? 0.8 : 0.95}
                      />
                      {/* Extraction groove */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={CHAMBER_HOLE_R - 1.7}
                        fill="none"
                        stroke="#000000"
                        strokeOpacity={0.35}
                        strokeWidth={0.7}
                      />
                      {/* Primer */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={2.6}
                        fill="url(#bulletPrimer)"
                        stroke={isBulletHit ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.08)"}
                        strokeWidth={0.55}
                      />
                      {/* Firing pin mark */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={0.42}
                        fill={isBulletHit ? "rgba(239,68,68,0.9)" : "rgba(17,24,39,0.95)"}
                        opacity={0.9}
                      />
                      {/* Specular highlight */}
                      <path
                        d={`M ${cx - 2.2} ${cy - 2} A 3.2 3.2 0 0 1 ${cx + 0.6} ${cy - 2.8}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth={0.55}
                        strokeLinecap="round"
                      />
                    </motion.g>
                  )}

                  {/* Marker */}
                  <text
                    x={cx}
                    y={cy - LABEL_Y_OFFSET}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                    fontSize={3.2}
                    fill={labelFill}
                    opacity={0.95}
                    transform={labelTransform}
                  >
                    {num}
                  </text>
                </g>
              );
            })}

            {/* Hub */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={9.5}
              fill="url(#hub)"
              stroke="#52525b"
              strokeOpacity="0.45"
              strokeWidth="0.7"
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={6}
              fill="#05050a"
              stroke="#3f3f46"
              strokeOpacity="0.6"
              strokeWidth="0.6"
            />
          </motion.g>
              </>
            );
          })()}
        </svg>
      </div>

      {/* Picks */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground uppercase tracking-widest">
            {t("visuals_pick_player")}
          </span>
          <span className="font-mono font-semibold text-orange-300">
            {playerPickDisplay}
          </span>
        </div>
        <div className="h-4 w-px bg-border/50" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground uppercase tracking-widest">
            {t("visuals_pick_server")}
          </span>
          <span className={cn("font-mono font-semibold", serverPickClass)}>
            {serverPickDisplay}
          </span>
        </div>
      </div>
    </div>
  );
};

export const GameVisuals = ({ table }: { table: Table }) => {
  const { address } = useAppKitAccount();
  const t = useTranslations("roulette");

  const state = useMemo(() => {
    return deriveGameVisualState(table, address, t("badge_you"));
  }, [table, address, t]);

  return <GameVisualsView {...state} />;
};
