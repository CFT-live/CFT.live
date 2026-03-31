import type { Metadata } from "next";
import RevokePage from "@/app/features/revoke/v1/RevokePage";

export const metadata: Metadata = {
  title: "CFT.live - Approval Manager",
  description:
    "View and revoke ERC-20 token spending approvals on Arbitrum. Stay in control of your wallet security.",
};

export default function Page() {
  return <RevokePage />;
}
