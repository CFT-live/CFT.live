"use client";

import { useSafeWriteContract } from "../../../hooks/useSafeWriteContract";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect } from "react";
import {
  CLOSED_ROUNDS_QUERY_KEY,
  LIVE_ROUNDS_QUERY_KEY,
  OPEN_ROUNDS_QUERY_KEY,
  USER_BETS_QUERY_KEY,
} from "../../../queries/keys";
import { useQueryClient } from "@tanstack/react-query";
import { MILLIS } from "@/app/helpers";
import { ContractButton } from "../../ContractButton";

export const AdvanceState = ({
  contractOwnerAddress,
}: {
  contractOwnerAddress: string;
}) => {
  const queryClient = useQueryClient();
  const { address } = useAppKitAccount();
  const {
    writeToContract,
    isLoading,
    isSuccess: success,
    errorMessage,
  } = useSafeWriteContract();

  const handleAdvance = () => {
    writeToContract("advance");
  };

  useEffect(() => {
    if (success) {
      // Advancing state can move rounds between states, so invalidate all round queries
      // Open → Live, Live → Closed, affects user bets
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [OPEN_ROUNDS_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [LIVE_ROUNDS_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [CLOSED_ROUNDS_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [USER_BETS_QUERY_KEY] });
      }, 2 * MILLIS.inSecond);
    }
  }, [success, queryClient]);

  if (address?.toLowerCase() !== contractOwnerAddress.toLowerCase()) {
    return <></>;
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            Contract State
          </h3>
          <p className="text-sm text-gray-300 mt-1">
            Advance contract to next state
          </p>
        </div>
      </div>

      <ContractButton
        onClick={handleAdvance}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Advancing...
          </span>
        ) : (
          "Advance State"
        )}
      </ContractButton>

      {success && (
        <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-300 text-sm flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          State advanced successfully!
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm flex items-start">
          <svg
            className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {errorMessage}
        </div>
      )}
    </div>
  );
};
