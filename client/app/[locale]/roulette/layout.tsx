
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CFT.live - Roulette",
  description: "Play a deadly game of chance with crypto at stake.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
