import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  isBetClaimable,
  isWinningBet,
  MILLIS,
  weiToUsdcString,
} from "../../helpers";
import { Bet } from "../../types";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";
import { ContractButton } from "../ContractButton";

interface BetRowProps {
  bet: Bet;
  claimLoading: boolean;
  claimWinnings: () => void;
}

export const BetRow = ({ bet, claimLoading, claimWinnings }: BetRowProps) => {
  const betProfit = getBetProfit(bet);
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-mono text-sm font-medium">#{bet.round.id}</TableCell>
      <TableCell>
        <Badge variant={getPositionVariant(bet.position)} className="w-16 justify-center">{bet.position}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={getPositionVariant(bet.round.finalPosition)} className="w-16 justify-center">
          {bet.round.finalPosition || "-"}
        </Badge>
      </TableCell>
      <TableCell className="font-mono">
        ${weiToUsdcString(bet.amount)}
      </TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(bet.round.status)} className="uppercase text-[10px]">
          {bet.round.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={getResultVariant(bet)} className="uppercase text-[10px]">{getResultText(bet)}</Badge>
      </TableCell>
      <TableCell>
        {bet.round.status === "CLOSED" ? (
          <span
            className={cn(
              "font-mono font-bold",
              betProfit >= 0 ? "text-green-500" : "text-destructive"
            )}
          >
            {betProfit >= 0 ? "+" : ""}${weiToUsdcString(betProfit)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {bet.round.status === "CLOSED" && bet.isWinner ? (
          <span className="text-green-500 font-mono font-bold">
            ${weiToUsdcString(bet.payout)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs font-mono whitespace-nowrap">
        {formatDate(bet.createdAt)}
      </TableCell>
      <TableCell>
        {renderActionButton(bet, claimWinnings, claimLoading)}
      </TableCell>
    </TableRow>
  );
};

export const BetCard = ({ bet, claimLoading, claimWinnings }: BetRowProps) => {
  const betProfit = getBetProfit(bet);
  
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden">
      <CardHeader className="p-4 pb-2 border-b border-border/50 flex flex-col md:flex-row items-start md:items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">#{bet.round.id}</span>
          <Badge variant={getStatusVariant(bet.round.status)} className="text-[10px] h-5">
            {bet.round.status}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(bet.createdAt)}
        </span>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Position</p>
          <div className="flex items-center gap-2">
            <Badge variant={getPositionVariant(bet.position)} className="w-14 justify-center text-[10px]">
              {bet.position}
            </Badge>
            <span className="text-xs text-muted-foreground">vs</span>
            <Badge variant={getPositionVariant(bet.round.finalPosition)} className="w-14 justify-center text-[10px]">
              {bet.round.finalPosition || "?"}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-1 text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Amount</p>
          <p className="font-mono font-medium">${weiToUsdcString(bet.amount)}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Result</p>
          <Badge variant={getResultVariant(bet)} className="text-[10px]">
            {getResultText(bet)}
          </Badge>
        </div>

        <div className="space-y-1 text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">P/L</p>
          {bet.round.status === "CLOSED" ? (
            <span
              className={cn(
                "font-mono font-bold text-sm",
                betProfit >= 0 ? "text-green-500" : "text-destructive"
              )}
            >
              {betProfit >= 0 ? "+" : ""}${weiToUsdcString(betProfit)}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </CardContent>
      
      {(isBetClaimable(bet) || bet.claimed) && (
        <CardFooter className="p-3 bg-muted/20 border-t border-border/50 flex justify-end">
           {renderActionButton(bet, claimWinnings, claimLoading)}
        </CardFooter>
      )}
    </Card>
  );
};

const getBetProfit = (bet: Bet): bigint => {
  if (isWinningBet(bet)) {
    const payout =
      bet.position === "UP" ? bet.round.payoutUp : bet.round.payoutDown;
    const multiplier = Number(formatUnits(payout, 18)); // 2.0
    const profitWei = BigInt(Math.floor(multiplier * Number(bet.amount)));
    return profitWei - BigInt(Number(bet.amount));
  }
  return BigInt(Number(bet.amount) * -1);
};

const getPositionVariant = (
  position: string | undefined
): "default" | "secondary" | "destructive" | "outline" => {
  switch (position) {
    case "UP":
      return "default";
    case "DOWN":
      return "destructive";
    default:
      return "secondary";
  }
};

const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "OPEN":
      return "default";
    case "LIVE":
      return "outline";
    case "CLOSED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
};

const getResultVariant = (
  bet: Bet
): "default" | "secondary" | "destructive" | "outline" => {
  if (bet.isRefund || bet.round.status !== "CLOSED") {
    return "outline";
  }
  if (isWinningBet(bet)) {
    return "default";
  }
  return "destructive";
};

const getResultText = (bet: Bet) => {
  if (bet.round.status === "CANCELLED") {
    return "Unset";
  }
  if (bet.round.status !== "CLOSED") {
    return "Pending";
  }
  if (bet.isRefund) {
    return "Refund";
  }
  return isWinningBet(bet) ? "Won" : "Lost";
};

const formatDate = (timestamp: string) => {
  const date = new Date(Number.parseInt(timestamp) * MILLIS.inSecond);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

const renderActionButton = (
  bet: Bet,
  claimWinnings: () => void,
  claimLoading: boolean
) => {
  if (bet.claimed) {
    return (
      <span className="text-primary text-xs font-semibold flex items-center">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Claimed
      </span>
    );
  }

  if (isBetClaimable(bet)) {
    return (
      <ContractButton
        onClick={claimWinnings}
        size="sm"
        variant="default"
        disabled={claimLoading}
      >
        {claimLoading ? "Claiming..." : "Claim Winnings"}
      </ContractButton>
    );
  }

  return <span className="text-muted-foreground text-xs">-</span>;
};
