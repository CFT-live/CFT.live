"use client";

import { Round, Position } from "../../../../types";
import RoundRow from "./round-row";

interface RoundsTableProps {
  rounds: Round[];
  openBetDialog?: (position: Position, roundId: string, amount?: string) => void;
}

export default function RoundsTable({
  rounds,
  openBetDialog,
}: Readonly<RoundsTableProps>) {
  return (
    <div className="relative">
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-4 px-1">
          {rounds.map((round) => (
            <RoundRow
              key={round.id}
              round={round}
              getStatusVariant={getStatusVariant}
              openBetDialog={openBetDialog}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "OPEN":
    case "LIVE":
    case "CLOSED":
      return "default";
    case "CANCELLED":
      return "outline";
    default:
      return "secondary";
  }
};
