import FeaturePage from "@/app/features/contribute/v1/FeaturePage";

export const metadata = {
  title: "Feature",
};

export default async function Page({
  params,
}: {
  params: Promise<{ featureId: string }>;
}) {
  const { featureId } = await params;
  return <FeaturePage featureId={featureId} />;
}
