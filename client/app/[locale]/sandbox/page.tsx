import { Metadata } from "next";
import SandboxPage from "@/app/features/sandbox/v1/SandboxPage";

export const metadata: Metadata = {
  title: "CFT.live - Contract Sandbox",
  description: "Emulate your EVM smart contracts in a safe environment.",
};

export default function Page() {
  return <SandboxPage />;
}
