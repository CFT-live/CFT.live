import { Metadata } from "next";
import FaqPage from "@/app/features/faq/v1/FaqPage";

export const metadata: Metadata = {
  title: "CFT.live - FAQ",
  description: "Frequently Asked Questions about CFT.live",
};

export default function Page() {
    return <FaqPage />;
}
