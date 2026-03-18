
import { useSafeWriteContract } from "./useSafeWriteContract";
import { Asset, Position } from "../../../../types";
import { ASSET_ENUM, POSITION_ENUM, usdcToWei } from "../../../../helpers";

export function useCreateRound(onSuccess?: () => void) {
  const { writeToContract, isLoading, isSuccess, errorMessage } =
    useSafeWriteContract(onSuccess);

  const createRound = async (
    lockAtSeconds: number,
    closeAtSeconds: number,
    asset: Asset,
    position: Position,
    amount: number | string,
  ): Promise<void> => {
    writeToContract("createOpenRoundAndBet", [
      lockAtSeconds,
      closeAtSeconds,
      ASSET_ENUM[asset],
      POSITION_ENUM[position],
      usdcToWei(amount),
    ]);
  };
  return { createRound, isLoading, isSuccess, errorMessage };
}
