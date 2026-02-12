import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import type { Feature, Task } from "../api/types";
import { TaskCard } from "../TaskCard";
import { createTask } from "../api/api";

type TasksSectionProps = {
  feature: Feature | null;
  tasks: Task[];
  tasksDone: number;
  tasksTotal: number;
  totalCpAwarded: number;
  activeContributors: number;
  allTasksDone: boolean;
  isAdmin: boolean;
  featureId: string;
  onRefresh: () => Promise<void>;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
};

export function TasksSection({
  feature,
  tasks,
  tasksDone,
  tasksTotal,
  totalCpAwarded,
  activeContributors,
  allTasksDone,
  isAdmin,
  featureId,
  onRefresh,
  onError,
  onSuccess,
}: TasksSectionProps) {
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskName, setCreateTaskName] = useState("");
  const [createTaskDescription, setCreateTaskDescription] = useState("");
  const [createTaskAcceptance, setCreateTaskAcceptance] = useState("");
  const [createTaskType, setCreateTaskType] =
    useState<Task["task_type"]>("TECH");
  const [creatingTask, setCreatingTask] = useState(false);

  const handleCreateTask = async () => {
    if (!feature) return;
    setCreatingTask(true);
    try {
      await createTask({
        feature_id: feature.id,
        name: createTaskName.trim(),
        description: createTaskDescription.trim(),
        task_type: createTaskType,
        acceptance_criteria: createTaskAcceptance.trim(),
        status: "OPEN",
      });
      setCreateTaskName("");
      setCreateTaskDescription("");
      setCreateTaskAcceptance("");
      setCreateTaskType("TECH");
      setCreateTaskOpen(false);
      onSuccess("Task created successfully!");
      await onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
      <div className="flex items-center justify-between gap-2 relative">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider">
          <span>{">"}</span> TASKS
        </h2>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button
              variant="outline"
              onClick={() => setCreateTaskOpen((v) => !v)}
            >
              {createTaskOpen ? (
                <>
                  <XCircle className="w-4 h-4" />
                  Close
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  New task
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Progress bar for tasks */}
      {feature && tasksTotal > 0 && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>Task Progress</span>
            <span>{Math.round((tasksDone / tasksTotal) * 100)}%</span>
          </div>
          <Progress value={(tasksDone / tasksTotal) * 100} className="h-2" />

          {/* Task status breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs font-mono">
            <div className="rounded-md border border-border/60 bg-background/50 p-2">
              <div className="text-muted-foreground">OPEN</div>
              <div className="font-semibold">
                {tasks.filter((t) => t.status === "OPEN").length}
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/50 p-2">
              <div className="text-muted-foreground">CLAIMED</div>
              <div className="font-semibold">
                {tasks.filter((t) => t.status === "CLAIMED").length}
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/50 p-2">
              <div className="text-muted-foreground">IN_REVIEW</div>
              <div className="font-semibold">
                {tasks.filter((t) => t.status === "IN_REVIEW").length}
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/50 p-2">
              <div className="text-muted-foreground">CHANGES</div>
              <div className="font-semibold">
                {tasks.filter((t) => t.status === "CHANGES_REQUESTED").length}
              </div>
            </div>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
              <div className="text-muted-foreground">DONE</div>
              <div className="font-semibold text-primary">{tasksDone}</div>
            </div>
          </div>

          {/* CP and contributor stats */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded-md border border-border/60 bg-background/50 p-2">
              <div className="text-muted-foreground">Total CP Awarded</div>
              <div className="font-semibold">{totalCpAwarded}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/50 p-2">
              <div className="text-muted-foreground">Active Contributors</div>
              <div className="font-semibold">{activeContributors}</div>
            </div>
          </div>

          {/* Completion alert for admins */}
          {isAdmin &&
          allTasksDone &&
          feature.status !== "COMPLETED" &&
          feature.status !== "CANCELLED" ? (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-mono font-semibold text-primary">
                    All tasks completed!
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">
                    This feature is ready to be marked as COMPLETED. Use the
                    &ldquo;Mark Complete&rdquo; button above to finalize it and
                    enable token distributions.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Completion banner */}
          {feature.status === "COMPLETED" ? (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-mono font-semibold text-primary">
                    Feature Completed
                  </p>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground">Total CP: </span>
                      <span className="font-semibold">{totalCpAwarded}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Contributors:{" "}
                      </span>
                      <span className="font-semibold">{activeContributors}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tasks: </span>
                      <span className="font-semibold">
                        {tasksDone}/{tasksTotal}
                      </span>
                    </div>
                  </div>
                  {isAdmin ? (
                    <p className="mt-2 text-xs text-muted-foreground font-mono">
                      Ready to create distributions on the Distributions page.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {createTaskOpen && isAdmin ? (
        <div
          key={`create-task-${createTaskOpen}`}
          className="mt-4 rounded-md border border-border/60 bg-background p-3"
        >
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider">
            <span>{">"}</span> CREATE TASK FOR THIS FEATURE
          </h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label
                htmlFor="task-name"
                className="text-xs font-mono text-muted-foreground"
              >
                Task name
              </label>
              <Input
                id="task-name"
                name="taskName"
                value={createTaskName}
                onChange={(e) => setCreateTaskName(e.target.value)}
                placeholder="Enter task name"
                disabled={creatingTask}
              />
            </div>
            <div>
              <label
                htmlFor="task-type"
                className="text-xs font-mono text-muted-foreground"
              >
                Type
              </label>
              <select
                id="task-type"
                name="taskType"
                value={createTaskType}
                onChange={(e) =>
                  setCreateTaskType(e.target.value as Task["task_type"])
                }
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-mono"
                disabled={creatingTask}
              >
                <option value="TECH">TECH</option>
                <option value="DESIGN">DESIGN</option>
                <option value="MARKETING">MARKETING</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="DOCS">DOCS</option>
                <option value="GENERAL">GENERAL</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="task-status"
                className="text-xs font-mono text-muted-foreground"
              >
                Status
              </label>
              <Input id="task-status" name="taskStatus" value="OPEN" disabled />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="task-description"
                className="text-xs font-mono text-muted-foreground"
              >
                Description
              </label>
              <textarea
                id="task-description"
                name="taskDescription"
                value={createTaskDescription}
                onChange={(e) => setCreateTaskDescription(e.target.value)}
                className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                placeholder="Describe the task requirements"
                disabled={creatingTask}
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="task-acceptance"
                className="text-xs font-mono text-muted-foreground"
              >
                Acceptance criteria
              </label>
              <textarea
                id="task-acceptance"
                name="taskAcceptance"
                value={createTaskAcceptance}
                onChange={(e) => setCreateTaskAcceptance(e.target.value)}
                className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                placeholder="List the acceptance criteria"
                disabled={creatingTask}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              variant={
                createTaskName.trim() &&
                createTaskAcceptance.trim() &&
                createTaskDescription.trim()
                  ? "default"
                  : "outline"
              }
              disabled={
                creatingTask ||
                !createTaskName.trim() ||
                !createTaskAcceptance.trim() ||
                !createTaskDescription.trim()
              }
              onClick={handleCreateTask}
            >
              {creatingTask ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create task"
              )}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2 relative">
        {tasks.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl text-muted-foreground/30 font-mono mb-2">
              [ ]
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              <span>{">"}</span> NO_TASKS_YET
            </p>
          </div>
        ) : null}

        {tasks
          .slice()
          .sort((a, b) => (a.created_date < b.created_date ? 1 : -1))
          .map((t) => {
            const statusIcon =
              t.status === "DONE" ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : t.status === "IN_REVIEW" ? (
                <Clock className="w-3 h-3" />
              ) : t.status === "CHANGES_REQUESTED" ? (
                <AlertCircle className="w-3 h-3" />
              ) : null;
            const statusVariant =
              t.status === "DONE"
                ? ("default" as const)
                : t.status === "IN_REVIEW"
                  ? ("secondary" as const)
                  : t.status === "CHANGES_REQUESTED"
                    ? ("destructive" as const)
                    : ("outline" as const);
            return (
              <TaskCard
                key={t.id}
                task={t}
                featureId={featureId}
                statusIcon={statusIcon}
                statusVariant={statusVariant}
              />
            );
          })}
      </div>
    </Card>
  );
}
