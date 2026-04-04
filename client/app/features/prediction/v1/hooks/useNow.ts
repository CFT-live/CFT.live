"use client";

import { useState, useEffect } from "react";
import { MILLIS } from "../../../../helpers";

// Module-level singleton: one interval shared across all consumers.
// Replacing per-component setInterval calls in TimeDisplay and BettingButtons.
const subscribers = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function startTick() {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    for (const fn of subscribers) fn();
  }, MILLIS.inSecond);
}

function stopTick() {
  if (subscribers.size > 0) return;
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const update = () => setNow(Date.now());
    subscribers.add(update);
    startTick();
    return () => {
      subscribers.delete(update);
      stopTick();
    };
  }, []);

  return now;
}
