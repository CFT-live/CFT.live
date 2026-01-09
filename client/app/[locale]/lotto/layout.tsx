
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CFT.live - Lotto",
  description: "A lucky lottery pot, where one player takes it all.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
