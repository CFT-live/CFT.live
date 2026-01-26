import TaskPage from "@/app/features/contribute/v1/TaskPage";

export const metadata = {
  title: "Task",
};

export default async function Page({
  params,
}: {
  params: Promise<{ featureId: string; taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskPage taskId={taskId} />;
}
