import type { Metadata } from "next";
import ApprovalManagerPage from "@/app/features/approval-manager/v1/ApprovalManagerPage";

export const metadata: Metadata = {
  title: "CFT.live - Approval Manager",
  description:
    "View and revoke ERC-20 token spending approvals on Arbitrum. Stay in control of your wallet security.",
};

export default function Page() {
  return <ApprovalManagerPage />;
}
