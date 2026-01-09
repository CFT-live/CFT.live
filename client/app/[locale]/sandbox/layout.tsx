
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CFT.live - Contract Sandbox",
  description: "Emulate your EVM smart contracts in a safe environment.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
