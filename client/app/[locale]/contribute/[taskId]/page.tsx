import { redirect } from "next/navigation";
import { getTask } from "@/app/features/contribute/v1/api/api";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; taskId: string }>;
}) {
  const { locale, taskId } = await params;
  
  try {
    const { task } = await getTask(taskId);
    if (task.feature_id) {
      redirect(`/${locale}/contribute/features/${task.feature_id}/tasks/${taskId}`);
    }
  } catch {
    // If task not found or no feature, redirect to features
  }
  
  redirect(`/${locale}/contribute/features`);
}
