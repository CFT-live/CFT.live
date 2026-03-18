"use client";

import { UserTicketCountMap } from "@/app/features/lotto/v1/hooks/useUserTicketCounts";

interface Draw {
  id: string;
  startTime: string;
  ticketPrice: string;
  potSize: string;
  ticketCount: string;
  open: boolean;
  winnerChosen: boolean;
  winner: string | null;
  claimed: boolean;
  closeTime: string | null;
  requestId: string | null;
}

interface DrawsTableProps {
  draws: Draw[];
  onBuyTickets?: (drawId: string) => void;
  onClaimWinnings?: (drawId: string) => void;
  onClaimRefund?: (drawId: string) => void;
  userAddress?: string;
  userTicketCounts?: UserTicketCountMap;
}

import DrawRow from "./DrawRow";

export default function DrawsTable({
  draws,
  onBuyTickets,
  onClaimWinnings,
  onClaimRefund,
  userAddress,
  userTicketCounts,
}: DrawsTableProps) {
  return (
    <div className="relative -mx-3 sm:mx-0">
      <div className="overflow-x-auto pb-3 sm:pb-4 custom-scrollbar px-3 sm:px-0">
        <div className="flex gap-3 sm:gap-4">
          {draws.map((draw) => (
            <DrawRow
              key={draw.id}
              draw={draw}
              onBuyTickets={onBuyTickets}
              onClaimWinnings={onClaimWinnings}
              onClaimRefund={onClaimRefund}
              userAddress={userAddress}
              userTicketCount={userTicketCounts?.[draw.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
