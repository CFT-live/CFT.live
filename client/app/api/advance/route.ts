import { NextRequest, NextResponse } from "next/server";
import { runAdvanceCheck } from "@/app/features/prediction/v1/api/actions";

// Simple in-memory lock to prevent concurrent advance operations
let isAdvanceInProgress = false;

/**
 * API endpoint for the advance check functionality.
 * This endpoint is protected by an API key and should only be called by the Cloudflare Worker.
 * 
 * Returns:
 * - nextCheckMs: The recommended delay in milliseconds before the next check
 * - nextDeadlineMs: The timestamp of the next deadline (if any)
 */
export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.ADVANCE_API_KEY;

  if (!expectedApiKey) {
    console.error("ADVANCE_API_KEY environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Prevent concurrent advance operations
  if (isAdvanceInProgress) {
    console.log("Advance operation already in progress, skipping...");
    return NextResponse.json({
      success: false,
      nextCheckMs: 10 * 1000, // Retry in 10 seconds
      message: "Advance operation already in progress",
    });
  }

  isAdvanceInProgress = true;

  try {
    const nextDeadlineMs = await runAdvanceCheck();

    if (nextDeadlineMs) {
      const now = Date.now();
      const timeUntilDeadline = nextDeadlineMs - now;
      // Schedule next check at the deadline, or in 60 seconds if deadline is too far
      // Minimum 3 seconds to avoid hammering
      const nextCheckMs = Math.max(
        3 * 1000,
        Math.min(timeUntilDeadline, 60 * 1000)
      );

      return NextResponse.json({
        success: true,
        nextDeadlineMs,
        nextCheckMs,
        message: `Next check in ${nextCheckMs / 1000} seconds`,
      });
    }

    // No active rounds, check again in 60 seconds
    return NextResponse.json({
      success: true,
      nextDeadlineMs: null,
      nextCheckMs: 60 * 1000,
      message: "No active rounds, next check in 60 seconds",
    });
  } catch (error) {
    console.error("Error in advance check:", error);
    return NextResponse.json(
      {
        error: "Failed to run advance check",
        nextCheckMs: 60 * 1000, // Retry in 60 seconds on error
      },
      { status: 500 }
    );
  } finally {
    isAdvanceInProgress = false;
  }
}

// Also support GET for health checks (without triggering the actual advance)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.ADVANCE_API_KEY;

  if (!expectedApiKey || !apiKey || apiKey !== expectedApiKey) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    status: "ok",
    message: "Advance API endpoint is healthy",
  });
}
