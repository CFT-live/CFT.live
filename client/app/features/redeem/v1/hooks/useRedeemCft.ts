"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import {
  erc20Abi,
  formatUnits,
  isAddress,
  maxUint256,
  parseSignature,
  parseUnits,
  zeroAddress,
} from "viem";
import {
  useChainId,
  useReadContract,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CFT_REDEMPTION_POOL_ABI,
  CFT_REDEMPTION_POOL_ADDRESS,
  CFT_TOKEN_ABI,
  CFT_TOKEN_ADDRESS,
  USDC_ADDRESS,
} from "@/app/lib/contracts";

const PERMIT_TTL_SECONDS = 20 * 60;
const SLIPPAGE_BPS = BigInt(50);
const BPS_DENOMINATOR = BigInt(10000);

function shortenErrorMessage(message: string, fallbackPrefix?: string) {
  if (message.includes("User rejected") || message.includes("User denied")) {
    return "Action cancelled in wallet. You can use the approval fallback below.";
  }

  if (message.includes("Execution reverted")) {
    return message.split("Execution reverted").slice(1).join("Execution reverted").trim() || fallbackPrefix || message;
  }

  return message.split("\n").slice(0, 2).join(" ") || fallbackPrefix || message;
}

function formatTokenValue(value: bigint | undefined, decimals: number | undefined, fallback = "0") {
  if (value === undefined || decimals === undefined) {
    return fallback;
  }

  return formatUnits(value, decimals);
}

function getConfigError(
  hasPoolAddress: boolean,
  hasTokenAddress: boolean,
  poolTokenAddress: `0x${string}` | undefined,
  tokenAddress: `0x${string}`
) {
  if (!hasPoolAddress) {
    return "Missing NEXT_PUBLIC_CFT_REDEMPTION_POOL_CONTRACT_ADDRESS.";
  }

  if (!hasTokenAddress) {
    return "Missing NEXT_PUBLIC_CFT_TOKEN_CONTRACT_ADDRESS.";
  }

  if (poolTokenAddress && poolTokenAddress.toLowerCase() !== tokenAddress.toLowerCase()) {
    return "The configured CFT token address does not match the redemption pool token.";
  }

  return null;
}

function getParsedAmount(amount: string, cftDecimals: number | undefined) {
  if (!amount.trim()) {
    return BigInt(0);
  }

  if (cftDecimals === undefined) {
    return null;
  }

  try {
    return parseUnits(amount, cftDecimals);
  } catch {
    return null;
  }
}

function isBalanceExceeded(parsedAmount: bigint | null, balance: bigint | undefined) {
  if (parsedAmount === null || balance === undefined) {
    return false;
  }

  return parsedAmount > balance;
}

function requiresApproval(parsedAmount: bigint | null, allowance: bigint | undefined) {
  if (parsedAmount === null || parsedAmount === BigInt(0) || allowance === undefined) {
    return false;
  }

  return allowance < parsedAmount;
}

function canSubmitRedeem(params: {
  isConnected: boolean;
  address: string | undefined;
  parsedAmount: bigint | null;
  exceedsBalance: boolean;
  quotedUsdc: bigint | undefined;
  configError: string | null;
}) {
  const { address, configError, exceedsBalance, isConnected, parsedAmount, quotedUsdc } = params;

  return Boolean(
    isConnected &&
      address &&
      parsedAmount !== null &&
      parsedAmount > BigInt(0) &&
      !exceedsBalance &&
      quotedUsdc !== undefined &&
      quotedUsdc > BigInt(0) &&
      !configError
  );
}

function canApproveRedeem(params: {
  isConnected: boolean;
  address: string | undefined;
  parsedAmount: bigint | null;
  exceedsBalance: boolean;
  configError: string | null;
}) {
  const { address, configError, exceedsBalance, isConnected, parsedAmount } = params;

  return Boolean(
    isConnected &&
      address &&
      parsedAmount !== null &&
      parsedAmount > BigInt(0) &&
      !exceedsBalance &&
      !configError
  );
}

export function useRedeemCft(amount: string, onSuccess?: () => void) {
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const hasPoolAddress = isAddress(CFT_REDEMPTION_POOL_ADDRESS);
  const hasTokenAddress = isAddress(CFT_TOKEN_ADDRESS);
  const poolAddress = hasPoolAddress ? CFT_REDEMPTION_POOL_ADDRESS : zeroAddress;
  const tokenAddress = hasTokenAddress ? CFT_TOKEN_ADDRESS : zeroAddress;

  const poolCftRead = useReadContract({
    address: poolAddress,
    abi: CFT_REDEMPTION_POOL_ABI,
    functionName: "cft",
    query: { enabled: hasPoolAddress },
  });

  const poolUsdcRead = useReadContract({
    address: poolAddress,
    abi: CFT_REDEMPTION_POOL_ABI,
    functionName: "usdc",
    query: { enabled: hasPoolAddress },
  });

  const usdcAddress = poolUsdcRead.data && isAddress(poolUsdcRead.data)
    ? poolUsdcRead.data
    : USDC_ADDRESS;

  const balanceRead = useReadContract({
    address: tokenAddress,
    abi: CFT_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: Boolean(address && hasTokenAddress && isConnected) },
  });

  const decimalsRead = useReadContract({
    address: tokenAddress,
    abi: CFT_TOKEN_ABI,
    functionName: "decimals",
    query: { enabled: hasTokenAddress },
  });

  const allowanceRead = useReadContract({
    address: tokenAddress,
    abi: CFT_TOKEN_ABI,
    functionName: "allowance",
    args: address && hasPoolAddress ? [address as `0x${string}`, poolAddress] : undefined,
    query: { enabled: Boolean(address && hasTokenAddress && hasPoolAddress && isConnected) },
  });

  const tokenNameRead = useReadContract({
    address: tokenAddress,
    abi: CFT_TOKEN_ABI,
    functionName: "name",
    query: { enabled: hasTokenAddress },
  });

  const nonceRead = useReadContract({
    address: tokenAddress,
    abi: CFT_TOKEN_ABI,
    functionName: "nonces",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: Boolean(address && hasTokenAddress && isConnected) },
  });

  const usdcDecimalsRead = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: isAddress(usdcAddress) },
  });

  const cftDecimals = decimalsRead.data;
  const usdcDecimals = usdcDecimalsRead.data;
  const balance = balanceRead.data;
  const allowance = allowanceRead.data;
  const nonce = nonceRead.data;
  const tokenName = tokenNameRead.data;

  const parsedAmount = useMemo(() => getParsedAmount(amount, cftDecimals), [amount, cftDecimals]);

  const quoteRead = useReadContract({
    address: poolAddress,
    abi: CFT_REDEMPTION_POOL_ABI,
    functionName: "quote",
    args: parsedAmount === null ? undefined : [parsedAmount],
    query: {
      enabled: Boolean(hasPoolAddress && parsedAmount !== null && parsedAmount > BigInt(0)),
      refetchInterval: 30000,
    },
  });

  const quotedUsdc = quoteRead.data;
  const minUsdcOut = quotedUsdc === undefined
    ? BigInt(0)
    : (quotedUsdc * (BPS_DENOMINATOR - SLIPPAGE_BPS)) / BPS_DENOMINATOR;

  const balanceFormatted = formatTokenValue(balance, cftDecimals);
  const allowanceFormatted = formatTokenValue(allowance, cftDecimals);
  const quotedUsdcFormatted = formatTokenValue(quotedUsdc, usdcDecimals);
  const minUsdcOutFormatted = formatTokenValue(minUsdcOut, usdcDecimals);

  const exceedsBalance = useMemo(() => isBalanceExceeded(parsedAmount, balance), [balance, parsedAmount]);

  const needsApproval = useMemo(() => requiresApproval(parsedAmount, allowance), [allowance, parsedAmount]);

  const configError = useMemo(
    () => getConfigError(hasPoolAddress, hasTokenAddress, poolCftRead.data, tokenAddress),
    [hasPoolAddress, hasTokenAddress, poolCftRead.data, tokenAddress]
  );

  const canSubmit = canSubmitRedeem({
    isConnected,
    address,
    parsedAmount,
    exceedsBalance,
    quotedUsdc,
    configError,
  });

  const canApprove = canApproveRedeem({
    isConnected,
    address,
    parsedAmount,
    exceedsBalance,
    configError,
  });

  const { signTypedDataAsync, isPending: isSigningPermit } = useSignTypedData();

  const {
    mutate: approveMutate,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();

  const {
    mutate: redeemMutate,
    data: redeemHash,
    isPending: isRedeemPending,
    error: redeemError,
  } = useWriteContract();

  const {
    mutate: permitRedeemMutate,
    data: permitRedeemHash,
    isPending: isPermitWritePending,
    error: permitRedeemError,
  } = useWriteContract();

  const approveReceipt = useWaitForTransactionReceipt({
    hash: approveHash,
    query: { enabled: Boolean(approveHash) },
  });

  const redeemReceipt = useWaitForTransactionReceipt({
    hash: redeemHash,
    query: { enabled: Boolean(redeemHash) },
  });

  const permitReceipt = useWaitForTransactionReceipt({
    hash: permitRedeemHash,
    query: { enabled: Boolean(permitRedeemHash) },
  });

  const refetchState = useCallback(() => {
    balanceRead.refetch();
    allowanceRead.refetch();
    nonceRead.refetch();
    quoteRead.refetch();
  }, [allowanceRead, balanceRead, nonceRead, quoteRead]);

  useEffect(() => {
    if (approveReceipt.isSuccess) {
      setStatusMessage("Allowance updated. You can now redeem through the approval flow.");
      setErrorMessage(null);
      refetchState();
    }
  }, [approveReceipt.isSuccess, refetchState]);

  useEffect(() => {
    if (redeemReceipt.isSuccess) {
      setStatusMessage("Redeem transaction confirmed.");
      setErrorMessage(null);
      refetchState();
      onSuccess?.();
    }
  }, [onSuccess, redeemReceipt.isSuccess, refetchState]);

  useEffect(() => {
    if (permitReceipt.isSuccess) {
      setStatusMessage("Permit redeem transaction confirmed.");
      setErrorMessage(null);
      refetchState();
      onSuccess?.();
    }
  }, [onSuccess, permitReceipt.isSuccess, refetchState]);

  useEffect(() => {
    if (approveError) {
      setErrorMessage(`Approval failed: ${shortenErrorMessage(approveError.message)}`);
    }
  }, [approveError]);

  useEffect(() => {
    if (redeemError) {
      setErrorMessage(`Redeem failed: ${shortenErrorMessage(redeemError.message)}`);
    }
  }, [redeemError]);

  useEffect(() => {
    if (permitRedeemError) {
      setErrorMessage(`Permit redeem failed: ${shortenErrorMessage(permitRedeemError.message)}`);
    }
  }, [permitRedeemError]);

  const clearMessages = useCallback(() => {
    setErrorMessage(null);
    setStatusMessage(null);
  }, []);

  const approveExact = useCallback(() => {
    if (!canApprove || parsedAmount === null || parsedAmount === BigInt(0)) {
      setErrorMessage("Enter a valid CFT amount before requesting allowance.");
      return;
    }

    clearMessages();
    approveMutate({
      address: tokenAddress,
      abi: CFT_TOKEN_ABI,
      functionName: "approve",
      args: [poolAddress, parsedAmount],
    });
  }, [approveMutate, canApprove, clearMessages, parsedAmount, poolAddress, tokenAddress]);

  const approveUnlimited = useCallback(() => {
    if (!hasPoolAddress || !hasTokenAddress) {
      setErrorMessage(configError || "Contract configuration is incomplete.");
      return;
    }

    clearMessages();
    approveMutate({
      address: tokenAddress,
      abi: CFT_TOKEN_ABI,
      functionName: "approve",
      args: [poolAddress, maxUint256],
    });
  }, [approveMutate, clearMessages, configError, hasPoolAddress, hasTokenAddress, poolAddress, tokenAddress]);

  const redeemWithApproval = useCallback(() => {
    if (!canSubmit || parsedAmount === null || parsedAmount === BigInt(0)) {
      setErrorMessage("Enter a valid CFT amount before redeeming.");
      return;
    }

    if (needsApproval) {
      setErrorMessage("Approve enough CFT allowance before redeeming through the fallback flow.");
      return;
    }

    clearMessages();
    redeemMutate({
      address: poolAddress,
      abi: CFT_REDEMPTION_POOL_ABI,
      functionName: "redeem",
      args: [parsedAmount, minUsdcOut],
    });
  }, [canSubmit, clearMessages, minUsdcOut, needsApproval, parsedAmount, poolAddress, redeemMutate]);

  const redeemWithPermit = useCallback(async () => {
    if (!canSubmit || parsedAmount === null || parsedAmount === BigInt(0)) {
      setErrorMessage("Enter a valid CFT amount before redeeming.");
      return;
    }

    if (!address || nonce === undefined || !tokenName) {
      setErrorMessage("Wallet or token metadata is not ready yet. Please wait a moment and try again.");
      return;
    }

    clearMessages();

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + PERMIT_TTL_SECONDS);
      const signature = await signTypedDataAsync({
        account: address as `0x${string}`,
        domain: {
          name: tokenName,
          version: "1",
          chainId,
          verifyingContract: tokenAddress,
        },
        types: {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "Permit",
        message: {
          owner: address as `0x${string}`,
          spender: poolAddress,
          value: parsedAmount,
          nonce,
          deadline,
        },
      });

      const { v, r, s } = parseSignature(signature);

      permitRedeemMutate({
        address: poolAddress,
        abi: CFT_REDEMPTION_POOL_ABI,
        functionName: "redeemWithPermit",
        args: [parsedAmount, minUsdcOut, deadline, v as unknown as number, r, s],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(shortenErrorMessage(message, "Unable to sign permit."));
    }
  }, [address, canSubmit, chainId, clearMessages, minUsdcOut, nonce, parsedAmount, permitRedeemMutate, poolAddress, signTypedDataAsync, tokenAddress, tokenName]);

  return {
    allowanceFormatted,
    balanceFormatted,
    canSubmit,
    configError,
    cftDecimals,
    errorMessage,
    exceedsBalance,
    isAnyPending:
      isApprovePending ||
      approveReceipt.isLoading ||
      isRedeemPending ||
      redeemReceipt.isLoading ||
      isSigningPermit ||
      isPermitWritePending ||
      permitReceipt.isLoading,
    isApprovalPending: isApprovePending || approveReceipt.isLoading,
    isPermitPending: isSigningPermit || isPermitWritePending || permitReceipt.isLoading,
    isQuoteLoading: quoteRead.isLoading,
    isRedeemPending: isRedeemPending || redeemReceipt.isLoading,
    maxAmount: balanceFormatted,
    minUsdcOutFormatted,
    needsApproval,
    parsedAmount,
    quotedUsdcFormatted,
    statusMessage,
    tokenName,
    usdcDecimals,
    approveExact,
    approveUnlimited,
    clearMessages,
    redeemWithApproval,
    redeemWithPermit,
  };
}