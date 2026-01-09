
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CFT.live - FAQ",
  description: "Frequently Asked Questions about CFT.live",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
