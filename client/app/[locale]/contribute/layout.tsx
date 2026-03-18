import type { ReactNode } from "react";

import ContributeNav from "@/app/features/contribute/v1/components/ContributeNav";

export const metadata = {
  title: "Contribute",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <ContributeNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
