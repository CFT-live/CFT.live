import { Metadata } from "next";
import LottoPage from "@/app/features/lotto/v1/LottoPage";

export const metadata: Metadata = {
  title: "CFT.live - Lotto",
  description: "A lucky lottery pot, where one player takes it all.",
};

export default function Page() {
    return <LottoPage />;
}
