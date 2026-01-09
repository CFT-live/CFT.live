"use client";

// TODO: This should only be used in local mode, not in production deployments.

import { useCallback, useEffect, useRef } from "react";
import { runAdvanceCheck } from "../lib/api/actions";
import { MILLIS } from "../helpers";

export const AutoAdvanceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isRunning = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async () => {
    if (isRunning.current) return;

    isRunning.current = true;
    try {
      const nextDeadlineMillis = await runAdvanceCheck();

      if (nextDeadlineMillis) {
        console.log(
          "Next advance deadline:",
          new Date(nextDeadlineMillis).toISOString()
        );
        // Schedule next check at the deadline, or in 60 seconds if deadline is too far
        const now = Date.now();
        const timeUntilDeadline = nextDeadlineMillis - now;
        const delay = Math.max(
          3 * MILLIS.inSecond,
          Math.min(timeUntilDeadline, 60 * MILLIS.inSecond)
        );
        console.log(`Scheduling next check in ${delay / 1000} seconds`);
        timeoutRef.current = setTimeout(run, delay);
      } else {
        // No active rounds, check again in 60 seconds
        console.log("No active rounds, checking again in 60 seconds");
        timeoutRef.current = setTimeout(run, 60 * MILLIS.inSecond);
      }
    } catch (error) {
      console.error("Failed to check/advance:", error);
      // On error, retry in 60 seconds
      timeoutRef.current = setTimeout(run, 60 * MILLIS.inSecond);
    } finally {
      isRunning.current = false;
    }
  }, []);

  useEffect(() => {
    run();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [run]);

  return children;
};
